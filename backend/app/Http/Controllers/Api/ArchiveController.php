<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Archive;
use App\Models\Barangay;
use App\Models\Branch;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ArchiveController extends Controller
{
    /**
     * List archive records (primarily senior citizens) with filters.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $perPage = (int) $request->get('per_page', 15);

        // Base query
        $query = Archive::query()->with('archivedBy');

        // Filter by a specific archive type if requested
        if ($type = $request->get('archive_type')) {
            $query->where('archive_type', $type);
        }

        // Enforce access control: Barangay admins cannot view archives
        if ($user->isBarangayAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have access to archives.',
            ], 403);
        }

        // Field Office / Branch Admin: restrict to accessible barangays for senior archives
        if ($user->isBranchAdmin()) {
            $barangayIds = $user->getAccessibleBarangayIds();
            if (!empty($barangayIds)) {
                $placeholders = implode(',', array_fill(0, count($barangayIds), '?'));
                // This condition now correctly handles multiple archive types.
                // It restricts senior_citizen archives to the admin's barangays,
                // while still allowing access to other types like 'user' archives.
                $query->where(function ($q) use ($placeholders, $barangayIds) {
                    $q->where('archive_type', '!=', 'senior_citizen')
                        ->orWhereRaw(
                            "JSON_EXTRACT(archive_data, '$.barangay_id') IN ($placeholders)",
                            $barangayIds
                        );
                });
            } else {
                // If no accessible barangays, only show non-senior archives
                $query->where('archive_type', '!=', 'senior_citizen');
            }
        }

        // Reason filter
        if ($reason = $request->get('reason')) {
            $query->where('archive_reason', $reason);
        }

        // Date range filter (archived_at)
        if ($from = $request->get('from_date')) {
            $query->whereDate('archived_at', '>=', $from);
        }
        if ($to = $request->get('to_date')) {
            $query->whereDate('archived_at', '<=', $to);
        }

        // Enhanced search for multiple archive types
        if ($search = $request->get('search')) {
            $searchLike = "%{$search}%";
            $query->where(function ($q) use ($searchLike) {
                // Search logic for 'senior_citizen'
                $q->orWhere(function ($sq) use ($searchLike) {
                    $sq->where('archive_type', 'senior_citizen')
                        ->where(function ($ssq) use ($searchLike) {
                            $ssq->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(archive_data, '$.osca_id')) LIKE ?", [$searchLike])
                                ->orWhereRaw(
                                    "CONCAT_WS(' ', JSON_UNQUOTE(JSON_EXTRACT(archive_data, '$.first_name')), JSON_UNQUOTE(JSON_EXTRACT(archive_data, '$.last_name'))) LIKE ?",
                                    [$searchLike]
                                );
                        });
                });

                // Search logic for 'user' (admins, etc.)
                $q->orWhere(function ($uq) use ($searchLike) {
                    $uq->where('archive_type', 'admin_user')
                        ->where(function ($usq) use ($searchLike) {
                            $usq->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(archive_data, '$.employee_id')) LIKE ?", [$searchLike])
                                ->orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(archive_data, '$.username')) LIKE ?", [$searchLike])
                                ->orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(archive_data, '$.name')) LIKE ?", [$searchLike]);
                        });
                });
            });
        }

        $query->orderByDesc('archived_at');

        $paginator = $query->paginate($perPage);

        // Transform results for frontend
        $barangayCache = [];
        $branchCache = [];

        $paginator->getCollection()->transform(function (Archive $archive) use (&$barangayCache, &$branchCache) {
            $data = $archive->archive_data ?? [];

            $barangayId = $data['barangay_id'] ?? null;
            $barangayName = null;
            if ($barangayId) {
                if (!array_key_exists($barangayId, $barangayCache)) {
                    $barangayCache[$barangayId] = Barangay::find($barangayId)?->name;
                }
                $barangayName = $barangayCache[$barangayId];
            }

            $branchName = null;
            $branchId = $data['branch_id'] ?? null;
            if ($branchId) {
                if (!array_key_exists($branchId, $branchCache)) {
                    $branchCache[$branchId] = Branch::find($branchId)?->name;
                }
                $branchName = $branchCache[$branchId];
            }

            $fullName = trim(
                ($data['first_name'] ?? '') . ' ' .
                ($data['middle_name'] ?? '') . ' ' .
                ($data['last_name'] ?? '')
            );

            return [
                'id' => $archive->id,
                'archive_type' => $archive->archive_type,
                'reference_id' => $archive->reference_id,
                'archive_reason' => $archive->archive_reason,
                'archive_notes' => $archive->archive_notes,
                'osca_id' => $data['osca_id'] ?? null,
                'employee_id' => $data['employee_id'] ?? null,
                'username' => $data['username'] ?? null,
                'full_name' => $fullName,
                'barangay_id' => $barangayId,
                'barangay_name' => $barangayName,
                'branch_id' => $branchId,
                'branch_name' => $branchName,
                'deceased_date' => optional($archive->deceased_date)->format('Y-m-d'),
                'original_created_at' => optional($archive->original_created_at)->toIso8601String(),
                'original_updated_at' => optional($archive->original_updated_at)->toIso8601String(),
                'archived_at' => optional($archive->archived_at)->toIso8601String(),
                'archived_by' => $archive->archived_by,
                'archived_by_name' => $archive->archivedBy?->full_name,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $paginator,
        ]);
    }

    public function getTimeline($id){
    // Get audit logs for this specific record
    $logs = DB::table('audit_logs')
        ->leftJoin('users', 'users.id', '=', 'audit_logs.user_id')
        ->select(
            'audit_logs.*',
            'users.name as user_name' // Fix: use 'name' instead of first_name/last_name
        )
        ->where('target_id', $id)
        ->orderBy('created_at', 'desc')
        ->get();

    return response()->json([
        'data' => ['events' => $logs]
    ]);
    }

    /**
     * Get single archive record with full snapshot.
     */
    
    public function show(Request $request, int $id)
    {
        $user = $request->user();
        $archive = Archive::with('archivedBy')->findOrFail($id);

        // Enforce access rules (same as index)
        if ($user->isBarangayAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have access to archives.',
            ], 403);
        }

        if ($user->isBranchAdmin() && $archive->archive_type === 'senior_citizen') {
            $barangayIds = $user->getAccessibleBarangayIds();
            $barangayId = $archive->archive_data['barangay_id'] ?? null;
            if ($barangayId && !in_array($barangayId, $barangayIds)) {
                return response()->json([
                    'success' => false,
                    'message' => 'You do not have access to this record.',
                ], 403);
            }
        }

        $data = $archive->archive_data ?? [];

        $barangay = null;
        if (!empty($data['barangay_id'])) {
            $barangay = Barangay::find($data['barangay_id']);
        }

        $branch = null;
        if (!empty($data['branch_id'])) {
            $branch = Branch::find($data['branch_id']);
        }

        $fullName = trim(
            ($data['first_name'] ?? '') . ' ' .
            ($data['middle_name'] ?? '') . ' ' .
            ($data['last_name'] ?? '')
        );

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $archive->id,
                'archive_type' => $archive->archive_type,
                'reference_id' => $archive->reference_id,
                'archive_reason' => $archive->archive_reason,
                'archive_notes' => $archive->archive_notes,
                'snapshot' => $data,
                'osca_id' => $data['osca_id'] ?? null,
                'employee_id' => $data['employee_id'] ?? null,
                'username' => $data['username'] ?? null,
                'full_name' => $fullName,
                'barangay' => $barangay ? [
                    'id' => $barangay->id,
                    'name' => $barangay->name,
                ] : null,
                'branch' => $branch ? [
                    'id' => $branch->id,
                    'name' => $branch->name,
                ] : null,
                'deceased_date' => optional($archive->deceased_date)->format('Y-m-d'),
                'original_created_at' => optional($archive->original_created_at)->toIso8601String(),
                'original_updated_at' => optional($archive->original_updated_at)->toIso8601String(),
                'archived_at' => optional($archive->archived_at)->toIso8601String(),
                'archived_by' => $archive->archived_by,
                'archived_by_name' => $archive->archivedBy?->full_name,
            ],
        ]);
    }

    /**
     * Get activity timeline for an archived senior (audit trail + archive event).
     */
    public function timeline(Request $request, int $id)
{
    $user = $request->user();
    $archive = Archive::findOrFail($id);

    // Access checks... (Keep your existing check logic here)

    $referenceId = $archive->reference_id;
    
    // Ensure target_type matches your audit_logs table naming convention
    $targetType = $archive->archive_type === 'senior_citizen' ? 'senior_citizens' : 'users';

    // Fetch audit logs
    $auditLogs = DB::table('audit_logs')
        ->leftJoin('users', 'users.id', '=', 'audit_logs.user_id')
        ->select(
            'audit_logs.id',
            'audit_logs.action',
            'audit_logs.description',
            'audit_logs.created_at',
            'audit_logs.old_values', // Added this
            'audit_logs.new_values', // Added this
            'users.name as user_name'
        )
        ->where('target_type', $targetType) 
        ->where('target_id', $referenceId) 
        ->orderBy('created_at', 'desc') // Changed to desc for latest first
        ->get();

    $events = [];

    foreach ($auditLogs as $log) {
        $events[] = [
            'type' => 'audit',
            'action' => $log->action,
            'description' => $log->description,
            'user_name' => $log->user_name,
            'created_at' => $log->created_at, // DB table gives string, React uses it as is
            'old_values' => $log->old_values ? json_decode($log->old_values, true) : null,
            'new_values' => $log->new_values ? json_decode($log->new_values, true) : null,
        ];
    }

    // Append archive event
    $events[] = [
        'type' => 'archived',
        'reason' => $archive->archive_reason,
        'notes' => $archive->archive_notes,
        'archived_at' => optional($archive->archived_at)->toDateTimeString(),
    ];

    return response()->json([
        'success' => true,
        'data' => [
            'reference_id' => $referenceId,
            'events' => $events,
        ],
    ]);
    }
}