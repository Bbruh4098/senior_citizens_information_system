<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IdPrintingQueue;
use App\Models\SeniorCitizen;
use App\Models\SeniorId;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class IdPrintingController extends Controller
{
    /**
     * Get paginated list of ID printing queue.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $perPage = $request->get('per_page', 10);
        
        $query = IdPrintingQueue::with(['senior', 'senior.barangay', 'requestedBy'])
            ->when(!$user->isMainAdmin(), function ($q) use ($user) {
                $barangayIds = $user->getAccessibleBarangayIds();
                $q->whereHas('senior', function ($sq) use ($barangayIds) {
                    $sq->whereIn('barangay_id', $barangayIds);
                });
            });

        // Status filter
        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }

        // Priority filter
        if ($priority = $request->get('priority')) {
            $query->where('priority', $priority);
        }

        // ID type filter
        if ($idType = $request->get('id_type')) {
            $query->where('id_type', $idType);
        }

        // Search
        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('queue_number', 'like', "%{$search}%")
                    ->orWhereHas('senior', function ($sq) use ($search) {
                        $sq->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%")
                            ->orWhere('osca_id', 'like', "%{$search}%");
                    });
            });
        }

        // Sort by priority (express > urgent > normal) then by most recent first
        $query->orderByRaw("FIELD(priority, 'express', 'urgent', 'normal')")
            ->orderBy('requested_date', 'desc');

        $items = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $items,
        ]);
    }

    /**
     * Add a senior to the ID printing queue.
     */
    public function addToQueue(Request $request)
    {
        $request->validate([
            'senior_id' => 'required|integer|exists:senior_citizens,id',
            'id_type' => 'required|in:new,renewal,replace_lost,replace_damaged',
            'priority' => 'nullable|in:normal,urgent,express',
            'notes' => 'nullable|string|max:500',
        ]);

        $user = $request->user();

        // Check if senior already has a pending/in_progress queue item
        $existingQueue = IdPrintingQueue::where('senior_id', $request->senior_id)
            ->whereIn('status', ['pending', 'in_progress'])
            ->first();

        if ($existingQueue) {
            return response()->json([
                'success' => false,
                'message' => 'This senior already has a pending ID in the queue.',
                'data' => $existingQueue,
            ], 422);
        }

        // Generate queue number: QN-YYYYMMDD-XXXX
        $today = now()->format('Ymd');
        $lastQueue = IdPrintingQueue::where('queue_number', 'like', "QN-{$today}-%")
            ->orderBy('queue_number', 'desc')
            ->first();
        
        $sequence = 1;
        if ($lastQueue) {
            $lastSequence = (int) substr($lastQueue->queue_number, -4);
            $sequence = $lastSequence + 1;
        }
        $queueNumber = sprintf("QN-%s-%04d", $today, $sequence);

        $queueItem = IdPrintingQueue::create([
            'senior_id' => $request->senior_id,
            'queue_number' => $queueNumber,
            'id_type' => $request->id_type,
            'priority' => $request->priority ?? 'normal',
            'status' => 'pending',
            'requested_by' => $user->id,
            'requested_date' => now(),
            'notes' => $request->notes,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Senior added to ID printing queue',
            'data' => $queueItem->fresh(['senior', 'senior.barangay']),
        ]);
    }

    /**
     * Get available seniors for adding to queue.
     */
    public function getAvailableSeniors(Request $request)
    {
        $user = $request->user();
        $search = $request->get('search', '');

        // Get seniors who don't have pending queue items
        $query = SeniorCitizen::with('barangay')
            ->whereNotNull('osca_id') // Must be approved (has OSCA ID)
            ->whereDoesntHave('idPrintingQueue', function ($q) {
                $q->whereIn('status', ['pending', 'in_progress']);
            })
            ->when(!$user->isMainAdmin(), function ($q) use ($user) {
                $barangayIds = $user->getAccessibleBarangayIds();
                $q->whereIn('barangay_id', $barangayIds);
            });

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('osca_id', 'like', "%{$search}%");
            });
        }

        $seniors = $query->orderBy('last_name')->limit(50)->get();

        return response()->json([
            'success' => true,
            'data' => $seniors,
        ]);
    }

    /**
     * Get ID card data for preview/printing.
     */
    public function getIdCardData(Request $request, $id)
    {
        $user = $request->user();

        $queueItem = IdPrintingQueue::with([
            'senior',
            'senior.barangay',
            'senior.contact',
            'senior.gender',
        ])->when(!$user->isMainAdmin(), function ($q) use ($user) {
            $barangayIds = $user->getAccessibleBarangayIds();
            $q->whereHas('senior', function ($sq) use ($barangayIds) {
                $sq->whereIn('barangay_id', $barangayIds);
            });
        })->findOrFail($id);

        $senior = $queueItem->senior;
        
        // Build address
        $addressParts = array_filter([
            $senior->house_number,
            $senior->street,
            $senior->barangay->name ?? '',
            'Zamboanga City'
        ]);
        $address = implode(', ', $addressParts);

        // Calculate age
        $age = $senior->birthdate ? $senior->birthdate->age : null;

        // Issue date (no expiry — Senior IDs don't expire)
        $issueDate = now();

        // Photo URL (from application documents)
        $photoDoc = DB::table('application_documents')
            ->where('application_id', function ($q) use ($senior) {
                $q->select('id')
                    ->from('applications')
                    ->where('senior_id', $senior->id)
                    ->where('status', 'Approved')
                    ->orderBy('created_at', 'desc')
                    ->limit(1);
            })
            ->where('document_type_id', 4) // Photo type
            ->first();

        $photoUrl = $photoDoc ? Storage::disk(config('filesystems.upload_disk'))->url($photoDoc->file_path) : null;

        // QR Code data (will be generated on frontend using this data)
        $qrData = [
            'osca_id' => $senior->osca_id,
            'name' => trim("{$senior->first_name} {$senior->last_name}"),
            'birthdate' => $senior->birthdate?->format('Y-m-d'),
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'queue_item' => $queueItem,
                'card_data' => [
                    'osca_id' => $senior->osca_id,
                    'full_name' => trim("{$senior->first_name} {$senior->middle_name} {$senior->last_name} {$senior->extension}"),
                    'first_name' => $senior->first_name,
                    'middle_name' => $senior->middle_name,
                    'last_name' => $senior->last_name,
                    'extension' => $senior->extension,
                    'birthdate' => $senior->birthdate?->format('F d, Y'),
                    'birthdate_raw' => $senior->birthdate?->format('Y-m-d'),
                    'age' => $age,
                    'gender' => $senior->gender->name ?? null,
                    'address' => $address,
                    'barangay' => $senior->barangay->name ?? null,
                    'photo_url' => $photoUrl,
                    'issue_date' => $issueDate->format('F d, Y'),
                    'qr_data' => json_encode($qrData),
                ],
            ],
        ]);
    }

    /**
     * Get multiple ID cards data for batch printing.
     */
    public function getBatchCardData(Request $request)
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer|exists:id_printing_queue,id',
        ]);

        $user = $request->user();
        $cards = [];

        foreach ($request->ids as $id) {
            $queueItem = IdPrintingQueue::with([
                'senior',
                'senior.barangay',
                'senior.contact',
                'senior.gender',
            ])->when(!$user->isMainAdmin(), function ($q) use ($user) {
                $barangayIds = $user->getAccessibleBarangayIds();
                $q->whereHas('senior', function ($sq) use ($barangayIds) {
                    $sq->whereIn('barangay_id', $barangayIds);
                });
            })->find($id);

            if (!$queueItem) continue;

            $senior = $queueItem->senior;
            
            $addressParts = array_filter([
                $senior->house_number,
                $senior->street,
                $senior->barangay->name ?? '',
                'Zamboanga City'
            ]);
            
            $photoDoc = DB::table('application_documents')
                ->where('application_id', function ($q) use ($senior) {
                    $q->select('id')
                        ->from('applications')
                        ->where('senior_id', $senior->id)
                        ->where('status', 'Approved')
                        ->orderBy('created_at', 'desc')
                        ->limit(1);
                })
                ->where('document_type_id', 4)
                ->first();

            $cards[] = [
                'queue_id' => $id,
                'queue_number' => $queueItem->queue_number,
                'osca_id' => $senior->osca_id,
                'full_name' => trim("{$senior->first_name} {$senior->middle_name} {$senior->last_name} {$senior->extension}"),
                'first_name' => $senior->first_name,
                'middle_name' => $senior->middle_name,
                'last_name' => $senior->last_name,
                'extension' => $senior->extension,
                'birthdate' => $senior->birthdate?->format('F d, Y'),
                'birthdate_raw' => $senior->birthdate?->format('Y-m-d'),
                'gender' => $senior->gender->name ?? null,
                'address' => implode(', ', $addressParts),
                'photo_url' => $photoDoc ? Storage::disk(config('filesystems.upload_disk'))->url($photoDoc->file_path) : null,
                'issue_date' => now()->format('F d, Y'),
                'qr_data' => json_encode([
                    'osca_id' => $senior->osca_id,
                    'name' => trim("{$senior->first_name} {$senior->last_name}"),
                    'birthdate' => $senior->birthdate?->format('Y-m-d'),
                ]),
            ];
        }

        return response()->json([
            'success' => true,
            'data' => $cards,
        ]);
    }

    /**
     * Update queue item status.
     */
    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:pending,in_progress,printed,claimed,cancelled',
            'notes' => 'nullable|string|max:500',
        ]);

        $user = $request->user();
        
        $item = IdPrintingQueue::when(!$user->isMainAdmin(), function ($q) use ($user) {
            $barangayIds = $user->getAccessibleBarangayIds();
            $q->whereHas('senior', function ($sq) use ($barangayIds) {
                $sq->whereIn('barangay_id', $barangayIds);
            });
        })->findOrFail($id);

        $updateData = [
            'status' => $request->status,
        ];

        if ($request->has('notes')) {
            $updateData['notes'] = $request->notes;
        }

        if ($request->status === 'in_progress') {
            $updateData['assigned_to'] = $user->id;
            $updateData['assigned_date'] = now();
        } elseif ($request->status === 'printed') {
            $updateData['printed_date'] = now();
            $updateData['printed_by'] = $user->id;
        } elseif ($request->status === 'claimed') {
            $updateData['claimed_date'] = now();
            $updateData['claimed_by'] = $user->id;
        }

        $item->update($updateData);

        // Create senior_ids record when marked as printed or claimed
        if (in_array($request->status, ['printed', 'claimed']) && $item->senior_id) {
            // Skip if this queue item already generated a senior_ids record (avoid duplicates on printed→claimed)
            $alreadyCreatedForThisQueue = SeniorId::where('senior_id', $item->senior_id)
                ->where('id_number', $item->senior->osca_id ?? '')
                ->where('print_date', '>=', $item->printed_date ?? now()->subMinutes(5))
                ->exists();

            if (!$alreadyCreatedForThisQueue) {
                // Deactivate all previous active IDs for this senior
                SeniorId::where('senior_id', $item->senior_id)->where('is_active', true)->update(['is_active' => false]);

                SeniorId::create([
                    'senior_id' => $item->senior_id,
                    'id_number' => $item->senior->osca_id ?? '',
                    'issue_date' => now(),
                    'is_active' => true,
                    'status_id' => 1,
                    'printed_by' => $user->id,
                    'print_date' => now(),
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Status updated successfully',
            'data' => $item->fresh(['senior', 'senior.barangay']),
        ]);
    }

    /**
     * Get statistics.
     */
    public function statistics(Request $request)
    {
        $user = $request->user();
        $barangayIds = $user->getAccessibleBarangayIds();

        $baseQuery = IdPrintingQueue::query()
            ->when(!$user->isMainAdmin(), function ($q) use ($barangayIds) {
                $q->whereHas('senior', function ($sq) use ($barangayIds) {
                    $sq->whereIn('barangay_id', $barangayIds);
                });
            });

        $stats = [
            'total' => (clone $baseQuery)->count(),
            'pending' => (clone $baseQuery)->where('status', 'pending')->count(),
            'in_progress' => (clone $baseQuery)->where('status', 'in_progress')->count(),
            'printed' => (clone $baseQuery)->where('status', 'printed')->count(),
            'claimed' => (clone $baseQuery)->where('status', 'claimed')->count(),
            'claimed_this_month' => (clone $baseQuery)
                ->where('status', 'claimed')
                ->whereMonth('claimed_date', now()->month)
                ->whereYear('claimed_date', now()->year)
                ->count(),
            'printed_today' => (clone $baseQuery)
                ->where('status', 'printed')
                ->whereDate('printed_date', now()->toDateString())
                ->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }

    /**
     * Bulk update for batch printing.
     */
    public function bulkPrint(Request $request)
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer|exists:id_printing_queue,id',
        ]);

        $user = $request->user();

        // Get queue items before update (for senior_ids creation)
        $queueItems = IdPrintingQueue::with('senior')
            ->whereIn('id', $request->ids)
            ->whereIn('status', ['pending', 'in_progress'])
            ->get();

        $updated = IdPrintingQueue::whereIn('id', $request->ids)
            ->whereIn('status', ['pending', 'in_progress'])
            ->update([
                'status' => 'printed',
                'printed_date' => now(),
                'printed_by' => $user->id,
            ]);

        // Create senior_ids records for printed items
        foreach ($queueItems as $item) {
            if ($item->senior_id) {
                // Deactivate existing active IDs
                SeniorId::where('senior_id', $item->senior_id)->where('is_active', true)->update(['is_active' => false]);

                SeniorId::create([
                    'senior_id' => $item->senior_id,
                    'id_number' => $item->senior->osca_id ?? '',
                    'issue_date' => now(),
                    'is_active' => true,
                    'status_id' => 1,
                    'printed_by' => $user->id,
                    'print_date' => now(),
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => "Batch print completed. {$updated} IDs marked as printed.",
            'updated_count' => $updated,
        ]);
    }

    /**
     * Bulk mark as claimed.
     */
    public function bulkClaim(Request $request)
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer|exists:id_printing_queue,id',
        ]);

        $user = $request->user();

        $updated = IdPrintingQueue::whereIn('id', $request->ids)
            ->where('status', 'printed')
            ->update([
                'status' => 'claimed',
                'claimed_date' => now(),
                'claimed_by' => $user->id,
            ]);

        return response()->json([
            'success' => true,
            'message' => "{$updated} IDs marked as claimed.",
            'updated_count' => $updated,
        ]);
    }

    /**
     * Get seniors without an active ID record.
     */
    public function seniorsWithoutId(Request $request)
    {
        $user = $request->user();
        $perPage = $request->get('per_page', 10);

        $query = SeniorCitizen::with(['barangay', 'gender'])
            ->whereNotNull('osca_id')
            ->where('is_active', true)
            ->where('is_deceased', false)
            ->whereDoesntHave('seniorIds', function ($q) {
                $q->where('is_active', true);
            })
            ->when(!$user->isMainAdmin(), function ($q) use ($user) {
                $barangayIds = $user->getAccessibleBarangayIds();
                $q->whereIn('barangay_id', $barangayIds);
            });

        // Search
        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('osca_id', 'like', "%{$search}%");
            });
        }

        $seniors = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $seniors,
        ]);
    }
}
