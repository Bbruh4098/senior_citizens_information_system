<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Branch;
use App\Models\Barangay;
use App\Models\UserRole;
use App\Traits\LogsAudit;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AccountController extends Controller
{
    use LogsAudit;
    /**
     * List all admin accounts with filters
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Only main admin can access this
        if (!$user->isMainAdmin()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $query = User::with(['role', 'branch', 'barangay']);

        // Filter by role
        if ($request->filled('role_id')) {
            $query->where('role_id', $request->role_id);
        }

        // Filter by branch
        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        // Filter by status
        if ($request->filled('is_active')) {
            $query->where('is_active', $request->is_active);
        }

        // Search by name, username, or email
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('username', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $accounts = $query->orderBy('role_id')
            ->orderBy('first_name')
            ->paginate($request->get('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $accounts->items(),
            'meta' => [
                'total' => $accounts->total(),
                'per_page' => $accounts->perPage(),
                'current_page' => $accounts->currentPage(),
                'last_page' => $accounts->lastPage(),
            ],
        ]);
    }

    /**
     * Get single account details
     */
    public function show(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->isMainAdmin()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $account = User::with(['role', 'branch', 'barangay'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $account,
        ]);
    }

    /**
     * Create new admin account
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->isMainAdmin()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'employee_id' => 'required|string|max:50|unique:admin_users',
            'username' => 'required|string|max:100|unique:admin_users',
            'password' => 'required|string|min:6',
            'first_name' => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'required|string|max:100',
            'extension' => 'nullable|string|max:10',
            'position' => 'nullable|string|max:100',
            'gender_id' => 'nullable|integer',
            'mobile_number' => 'nullable|string|max:20',
            'email' => 'required|email|unique:admin_users',
            'role_id' => 'required|integer|exists:user_roles,id',
            'branch_id' => 'nullable|integer|exists:branches,id',
            'barangay_id' => 'nullable|integer|exists:barangays,id',
        ]);

        // Validate role-specific requirements
        if ($validated['role_id'] == 2 && empty($validated['branch_id'])) {
            return response()->json([
                'error' => 'Branch is required for Field Office Admin'
            ], 422);
        }

        if ($validated['role_id'] == 3) {
            if (empty($validated['branch_id']) || empty($validated['barangay_id'])) {
                return response()->json([
                    'error' => 'Branch and Barangay are required for Barangay Admin'
                ], 422);
            }
        }

        // Hash password
        $validated['password_hash'] = Hash::make($validated['password']);
        unset($validated['password']);

        $account = User::create($validated);
        $account->load(['role', 'branch', 'barangay']);

        $this->logAudit(
            'account_create', 'users', $account->id,
            "Created account: {$account->username} ({$account->full_name})",
            null,
            ['username' => $account->username, 'role_id' => $account->role_id, 'branch_id' => $account->branch_id],
            $account->full_name
        );

        return response()->json([
            'success' => true,
            'message' => 'Account created successfully',
            'data' => $account,
        ], 201);
    }

    /**
     * Update admin account
     */
    public function update(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->isMainAdmin()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $account = User::findOrFail($id);

        $validated = $request->validate([
            'employee_id' => ['sometimes', 'string', 'max:50', Rule::unique('admin_users')->ignore($id)],
            'username' => ['sometimes', 'string', 'max:100', Rule::unique('admin_users')->ignore($id)],
            'first_name' => 'sometimes|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'sometimes|string|max:100',
            'extension' => 'nullable|string|max:10',
            'position' => 'nullable|string|max:100',
            'gender_id' => 'nullable|integer',
            'mobile_number' => 'nullable|string|max:20',
            'email' => ['sometimes', 'email', Rule::unique('admin_users')->ignore($id)],
            'role_id' => 'sometimes|integer|exists:user_roles,id',
            'branch_id' => 'nullable|integer|exists:branches,id',
            'barangay_id' => 'nullable|integer|exists:barangays,id',
        ]);

        // Validate role-specific requirements if role is being changed
        if (isset($validated['role_id'])) {
            if ($validated['role_id'] == 2 && empty($validated['branch_id'] ?? $account->branch_id)) {
                return response()->json([
                    'error' => 'Branch is required for Field Office Admin'
                ], 422);
            }

            if ($validated['role_id'] == 3) {
                $branchId = $validated['branch_id'] ?? $account->branch_id;
                $barangayId = $validated['barangay_id'] ?? $account->barangay_id;
                if (empty($branchId) || empty($barangayId)) {
                    return response()->json([
                        'error' => 'Branch and Barangay are required for Barangay Admin'
                    ], 422);
                }
            }
        }

        $diff = $this->buildChangeDiff($account, $validated);

        $account->update($validated);
        $account->load(['role', 'branch', 'barangay']);

        if (!empty($diff['changed'])) {
            $this->logAudit(
                'account_update', 'users', $account->id,
                "Updated account: {$account->username} — changed: " . implode(', ', $diff['changed']),
                $diff['old'], $diff['new'],
                $account->full_name
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Account updated successfully',
            'data' => $account,
        ]);
    }

    /**
     * Delete admin account
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->isMainAdmin()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        // Prevent self-deletion
        if ($user->id == $id) {
            return response()->json([
                'error' => 'You cannot delete your own account'
            ], 400);
        }

        $account = User::findOrFail($id);

        $this->logAudit(
            'account_delete', 'users', $account->id,
            "Deleted account: {$account->username} ({$account->full_name})",
            null, null, $account->full_name
        );

        $account->delete();

        return response()->json([
            'success' => true,
            'message' => 'Account deleted successfully',
        ]);
    }

    /**
     * Toggle account status (enable/disable)
     */
    public function toggleStatus(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->isMainAdmin()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        // Prevent self-disable
        if ($user->id == $id) {
            return response()->json([
                'error' => 'You cannot disable your own account'
            ], 400);
        }

        $account = User::findOrFail($id);
        $oldStatus = $account->is_active;
        $account->is_active = !$account->is_active;
        $account->save();

        $this->logAudit(
            'account_toggle_status', 'users', $account->id,
            "Toggled account {$account->username}: " . ($account->is_active ? 'enabled' : 'disabled'),
            ['is_active' => $oldStatus],
            ['is_active' => $account->is_active],
            $account->full_name
        );

        return response()->json([
            'success' => true,
            'message' => $account->is_active ? 'Account enabled' : 'Account disabled',
            'data' => $account,
        ]);
    }

    /**
     * Reset account password
     */
    public function resetPassword(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->isMainAdmin()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'password' => 'required|string|min:6',
        ]);

        $account = User::findOrFail($id);
        $account->password_hash = Hash::make($validated['password']);
        $account->save();

        $this->logAudit(
            'account_reset_password', 'users', $account->id,
            "Password reset for account: {$account->username}",
            null, null, $account->full_name
        );

        return response()->json([
            'success' => true,
            'message' => 'Password reset successfully',
        ]);
    }

    /**
     * Get dropdown options for creating/editing accounts
     */
    public function getOptions(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->isMainAdmin()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        try {
            $roles = UserRole::all();
            $branches = Branch::where('id', '>', 1)->get(); // Exclude main office
            $barangays = Barangay::orderBy('name')->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'roles' => $roles,
                    'branches' => $branches,
                    'barangays' => $barangays,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch options: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get barangays assigned to a specific branch (for filtered dropdown)
     */
    public function getBarangaysByBranch(Request $request, $branchId): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->isMainAdmin()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        try {
            $branch = Branch::findOrFail($branchId);
            $barangays = $branch->barangays()->orderBy('name')->get();

            return response()->json([
                'success' => true,
                'data' => $barangays,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch barangays: ' . $e->getMessage()
            ], 500);
        }
    }
}
