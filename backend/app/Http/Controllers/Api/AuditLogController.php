<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    // Paginated list of audit logs with filters.
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user->isMainAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Only Main Admin can access audit logs.',
            ], 403);
        }

        $query = AuditLog::with('user:id,first_name,last_name,username')
            ->orderByDesc('created_at');

        // Filters
        if ($action = $request->get('action')) {
            $query->byAction($action);
        }

        if ($userId = $request->get('user_id')) {
            $query->byUser($userId);
        }

        if ($targetType = $request->get('target_type')) {
            $query->forTarget($targetType);
        }

        if ($from = $request->get('from_date')) {
            $query->where('created_at', '>=', $from);
        }

        if ($to = $request->get('to_date')) {
            $query->where('created_at', '<=', $to . ' 23:59:59');
        }

        if ($search = $request->get('search')) {
            $query->search($search);
        }

        $perPage = (int) $request->get('per_page', 20);
        $logs = $query->paginate($perPage);

        // Transform
        $logs->getCollection()->transform(function (AuditLog $log) {
            return [
                'id'          => $log->id,
                'action'      => $log->action,
                'action_label'=> $log->action_label,
                'target_type' => $log->target_type,
                'target_id'   => $log->target_id,
                'target_name' => $log->target_name,
                'description' => $log->description,
                'ip_address'  => $log->ip_address,
                'created_at'  => $log->created_at?->toIso8601String(),
                'user'        => $log->user ? [
                    'id'       => $log->user->id,
                    'name'     => trim($log->user->first_name . ' ' . $log->user->last_name),
                    'username' => $log->user->username,
                ] : null,
                'has_changes' => !empty($log->old_values) || !empty($log->new_values),
            ];
        });

        return response()->json([
            'success' => true,
            'data'    => $logs,
        ]);
    }

    // Single audit log entry with full old/new values.
    public function show(Request $request, int $id)
    {
        $user = $request->user();
        if (!$user->isMainAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Only Main Admin can access audit logs.',
            ], 403);
        }

        $log = AuditLog::with('user:id,first_name,last_name,username')->findOrFail($id);

        return response()->json([
            'success' => true,
            'data'    => [
                'id'          => $log->id,
                'action'      => $log->action,
                'action_label'=> $log->action_label,
                'target_type' => $log->target_type,
                'target_id'   => $log->target_id,
                'target_name' => $log->target_name,
                'description' => $log->description,
                'old_values'  => $log->old_values,
                'new_values'  => $log->new_values,
                'ip_address'  => $log->ip_address,
                'created_at'  => $log->created_at?->toIso8601String(),
                'user'        => $log->user ? [
                    'id'       => $log->user->id,
                    'name'     => trim($log->user->first_name . ' ' . $log->user->last_name),
                    'username' => $log->user->username,
                ] : null,
            ],
        ]);
    }

    // Audit log summary statistics.
    public function stats(Request $request)
    {
        $user = $request->user();
        if (!$user->isMainAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Only Main Admin can access audit logs.',
            ], 403);
        }

        $today = now()->toDateString();

        // Top actions today
        $todayCount = AuditLog::whereDate('created_at', $today)->count();

        // Most active admin today
        $topAdmin = AuditLog::whereDate('created_at', $today)
            ->selectRaw('user_id, COUNT(*) as count')
            ->groupBy('user_id')
            ->orderByDesc('count')
            ->with('user:id,first_name,last_name')
            ->first();

        // Action breakdown (last 7 days)
        $actionBreakdown = AuditLog::where('created_at', '>=', now()->subDays(7))
            ->selectRaw('action, COUNT(*) as count')
            ->groupBy('action')
            ->orderByDesc('count')
            ->limit(10)
            ->get();

        // Total logs
        $totalLogs = AuditLog::count();

        // Distinct action types for filter dropdown
        $actionTypes = AuditLog::selectRaw('DISTINCT action')
            ->orderBy('action')
            ->pluck('action');

        // Distinct admins who have audit entries
        $admins = AuditLog::with('user:id,first_name,last_name,username')
            ->selectRaw('DISTINCT user_id')
            ->whereNotNull('user_id')
            ->get()
            ->pluck('user')
            ->filter()
            ->unique('id')
            ->values()
            ->map(fn($u) => [
                'id'       => $u->id,
                'name'     => trim($u->first_name . ' ' . $u->last_name),
                'username' => $u->username,
            ]);

        return response()->json([
            'success' => true,
            'data'    => [
                'total_logs'       => $totalLogs,
                'today_count'      => $todayCount,
                'top_admin_today'  => $topAdmin ? [
                    'name'  => trim($topAdmin->user?->first_name . ' ' . $topAdmin->user?->last_name),
                    'count' => $topAdmin->count,
                ] : null,
                'action_breakdown' => $actionBreakdown,
                'action_types'     => $actionTypes,
                'admins'           => $admins,
            ],
        ]);
    }
}
