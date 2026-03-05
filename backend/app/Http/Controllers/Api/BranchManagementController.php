<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Barangay;
use App\Models\District;
use App\Traits\LogsAudit;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class BranchManagementController extends Controller
{
    use LogsAudit;
    // ==========================================
    // BRANCHES (Field Offices) CRUD
    // ==========================================

    /**
     * List all branches with barangay counts
     */
    public function indexBranches(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->isMainAdmin()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $branches = Branch::withCount('barangays')
            ->orderBy('id')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $branches,
        ]);
    }

    /**
     * Get single branch with assigned barangays
     */
    public function showBranch(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->isMainAdmin()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $branch = Branch::with('barangays')->withCount('barangays')->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $branch,
        ]);
    }

    /**
     * Create new branch (Field Office)
     */
    public function storeBranch(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->isMainAdmin()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'code' => 'required|string|max:20|unique:branches',
            'name' => 'required|string|max:255',
            'address' => 'nullable|string',
            'contact_number' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'branch_head' => 'nullable|string|max:255',
        ]);

        $branch = Branch::create($validated);

        $this->logAudit(
            'branch_create', 'branches', $branch->id,
            "Field Office created: {$branch->name} ({$branch->code})",
            null, $validated, $branch->name
        );

        return response()->json([
            'success' => true,
            'message' => 'Field Office created successfully',
            'data' => $branch,
        ], 201);
    }

    /**
     * Update branch
     */
    public function updateBranch(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->isMainAdmin()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        // Don't allow editing Main Office (id=1)
        if ($id == 1) {
            return response()->json(['error' => 'Cannot modify Main Office'], 400);
        }

        $branch = Branch::findOrFail($id);

        $validated = $request->validate([
            'code' => 'sometimes|string|max:20|unique:branches,code,' . $id,
            'name' => 'sometimes|string|max:255',
            'address' => 'nullable|string',
            'contact_number' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'branch_head' => 'nullable|string|max:255',
            'is_active' => 'sometimes|boolean',
        ]);

        $branch->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Field Office updated successfully',
            'data' => $branch,
        ]);
    }

    /**
     * Delete branch (soft delete by setting is_active = false)
     */
    public function destroyBranch(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->isMainAdmin()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        // Don't allow deleting Main Office (id=1)
        if ($id == 1) {
            return response()->json(['error' => 'Cannot delete Main Office'], 400);
        }

        $branch = Branch::withCount('barangays')->findOrFail($id);

        // Check if branch has assigned barangays
        if ($branch->barangays_count > 0) {
            return response()->json([
                'error' => 'Cannot delete Field Office with assigned barangays. Please reassign them first.'
            ], 400);
        }

        // Check if branch has admin users
        $adminCount = DB::table('admin_users')->where('branch_id', $id)->count();
        if ($adminCount > 0) {
            return response()->json([
                'error' => 'Cannot delete Field Office with assigned admin users'
            ], 400);
        }

        $this->logAudit(
            'branch_delete', 'branches', $branch->id,
            "Field Office deleted: {$branch->name}",
            null, null, $branch->name
        );

        $branch->delete();

        return response()->json([
            'success' => true,
            'message' => 'Field Office deleted successfully',
        ]);
    }

    // ==========================================
    // BARANGAYS CRUD
    // ==========================================

    /**
     * List all barangays with branch assignment
     */
    public function indexBarangays(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->isMainAdmin()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $query = Barangay::with('branches');

        // Filter by branch
        if ($request->filled('branch_id')) {
            $branchId = $request->branch_id;
            if ($branchId === 'unassigned') {
                $query->whereDoesntHave('branches');
            } else {
                $query->whereHas('branches', function ($q) use ($branchId) {
                    $q->where('branches.id', $branchId);
                });
            }
        }

        // Search
        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        // Filter by district
        if ($request->filled('district')) {
            $district = $request->district;
            if ($district === 'unassigned') {
                $query->whereNull('district')->orWhere('district', '');
            } else {
                $query->where('district', $district);
            }
        }

        $barangays = $query->orderBy('name')->get();

        // Add current branch info to each barangay
        $barangays = $barangays->map(function ($barangay) {
            $currentBranch = $barangay->branches->first();
            return [
                'id' => $barangay->id,
                'code' => $barangay->code,
                'name' => $barangay->name,
                'district' => $barangay->district,
                'city' => $barangay->city,
                'branch_id' => $currentBranch?->id,
                'branch_name' => $currentBranch?->name,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $barangays,
        ]);
    }

    /**
     * Create new barangay
     */
    public function storeBarangay(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->isMainAdmin()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'code' => 'required|string|max:20|unique:barangays',
            'name' => 'required|string|max:255',
            'district' => 'nullable|string|max:50',
            'city' => 'nullable|string|max:100',
            'branch_id' => 'nullable|integer|exists:branches,id',
        ]);

        $branchId = $validated['branch_id'] ?? null;
        unset($validated['branch_id']);

        $validated['city'] = $validated['city'] ?? 'Zamboanga City';

        $barangay = Barangay::create($validated);

        // Assign to branch if specified
        if ($branchId) {
            DB::table('branch_barangays')->insert([
                'branch_id' => $branchId,
                'barangay_id' => $barangay->id,
                'assigned_date' => now()->toDateString(),
                'is_active' => true,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Barangay created successfully',
            'data' => $barangay,
        ], 201);
    }

    /**
     * Update barangay
     */
    public function updateBarangay(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->isMainAdmin()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $barangay = Barangay::findOrFail($id);

        $validated = $request->validate([
            'code' => 'sometimes|string|max:20|unique:barangays,code,' . $id,
            'name' => 'sometimes|string|max:255',
            'district' => 'nullable|string|max:50',
            'city' => 'nullable|string|max:100',
        ]);

        $barangay->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Barangay updated successfully',
            'data' => $barangay,
        ]);
    }

    /**
     * Delete barangay
     */
    public function destroyBarangay(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->isMainAdmin()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $barangay = Barangay::findOrFail($id);

        // Check if barangay has seniors
        $seniorCount = DB::table('seniors')->where('barangay_id', $id)->count();
        if ($seniorCount > 0) {
            return response()->json([
                'error' => 'Cannot delete barangay with registered seniors'
            ], 400);
        }

        // Remove from branch_barangays
        DB::table('branch_barangays')->where('barangay_id', $id)->delete();

        $barangay->delete();

        return response()->json([
            'success' => true,
            'message' => 'Barangay deleted successfully',
        ]);
    }

    // ==========================================
    // BARANGAY ASSIGNMENT
    // ==========================================

    /**
     * Assign barangay to a branch
     */
    public function assignBarangay(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->isMainAdmin()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'barangay_id' => 'required|integer|exists:barangays,id',
            'branch_id' => 'required|integer|exists:branches,id',
        ]);

        // Remove existing assignment
        DB::table('branch_barangays')
            ->where('barangay_id', $validated['barangay_id'])
            ->delete();

        // Create new assignment
        DB::table('branch_barangays')->insert([
            'branch_id' => $validated['branch_id'],
            'barangay_id' => $validated['barangay_id'],
            'assigned_date' => now()->toDateString(),
            'is_active' => true,
        ]);

        $barangay = Barangay::find($validated['barangay_id']);
        $branch = Branch::find($validated['branch_id']);

        $this->logAudit(
            'barangay_assign', 'barangays', $barangay->id,
            "Barangay {$barangay->name} assigned to {$branch->name}",
            null, ['branch_id' => $branch->id],
            $barangay->name
        );

        return response()->json([
            'success' => true,
            'message' => "Barangay {$barangay->name} assigned to {$branch->name}",
        ]);
    }

    /**
     * Unassign barangay from branch
     */
    public function unassignBarangay(Request $request, $barangayId): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->isMainAdmin()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        DB::table('branch_barangays')
            ->where('barangay_id', $barangayId)
            ->delete();

        return response()->json([
            'success' => true,
            'message' => 'Barangay unassigned successfully',
        ]);
    }

    /**
     * Bulk assign barangays to a branch
     */
    public function bulkAssign(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->isMainAdmin()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'branch_id' => 'required|integer|exists:branches,id',
            'barangay_ids' => 'required|array',
            'barangay_ids.*' => 'integer|exists:barangays,id',
        ]);

        $branchId = $validated['branch_id'];
        $barangayIds = $validated['barangay_ids'];

        // Remove existing assignments for these barangays
        DB::table('branch_barangays')
            ->whereIn('barangay_id', $barangayIds)
            ->delete();

        // Create new assignments
        $inserts = [];
        $assignedDate = now()->toDateString();
        foreach ($barangayIds as $barangayId) {
            $inserts[] = [
                'branch_id' => $branchId,
                'barangay_id' => $barangayId,
                'assigned_date' => $assignedDate,
                'is_active' => true,
            ];
        }

        DB::table('branch_barangays')->insert($inserts);

        $branch = Branch::find($branchId);
        $this->logAudit(
            'barangay_bulk_assign', 'branches', $branchId,
            count($barangayIds) . " barangays assigned to {$branch->name}",
            null, ['barangay_count' => count($barangayIds)],
            $branch->name
        );

        return response()->json([
            'success' => true,
            'message' => count($barangayIds) . ' barangays assigned successfully',
        ]);
    }

    /**
     * Get unassigned barangays
     */
    public function getUnassignedBarangays(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->isMainAdmin()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $barangays = Barangay::whereDoesntHave('branches')
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $barangays,
        ]);
    }

    
    // DISTRICTS CRUD //


     //List all districts with barangay counts     
    public function indexDistricts(Request $request): JsonResponse
    {
        $districts = District::withCount('barangays')
            ->with(['barangays' => function ($q) {
                $q->select('id', 'name', 'district')->orderBy('name');
            }])
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $districts,
        ]);
    }

    //Create new district
    public function storeDistrict(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:districts',
            'description' => 'nullable|string|max:255',
        ]);

        $district = District::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'District created successfully',
            'data' => $district,
        ], 201);
    }

    //Update district (also updates barangay references)
    public function updateDistrict(Request $request, $id): JsonResponse
    {
        $district = District::findOrFail($id);
        $oldName = $district->name;

        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:districts,name,' . $id,
            'description' => 'nullable|string|max:255',
        ]);

        // If name changed, update all barangays referencing the old name
        if ($oldName !== $validated['name']) {
            Barangay::where('district', $oldName)
                ->update(['district' => $validated['name']]);
        }

        $district->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'District updated successfully',
            'data' => $district->loadCount('barangays'),
        ]);
    }

    //Delete district (clears district from barangays)
    public function destroyDistrict(Request $request, $id): JsonResponse
    {
        $district = District::findOrFail($id);

        // Clear district reference from barangays
        Barangay::where('district', $district->name)
            ->update(['district' => null]);

        $district->delete();

        return response()->json([
            'success' => true,
            'message' => 'District deleted successfully',
        ]);
    }

    // Bulk assign barangays to a district
    public function assignDistrictBarangays(Request $request, $id): JsonResponse
    {
        $district = District::findOrFail($id);

        $validated = $request->validate([
            'barangay_ids' => 'required|array',
            'barangay_ids.*' => 'exists:barangays,id',
        ]);

        $districtName = $district->name;
        $barangayIds = $validated['barangay_ids'];

        DB::transaction(function () use ($districtName, $barangayIds) {
            // Clear this district from all barangays currently assigned to it
            Barangay::where('district', $districtName)
                ->update(['district' => null]);

            // Assign selected barangays to this district
            if (!empty($barangayIds)) {
                Barangay::whereIn('id', $barangayIds)
                    ->update(['district' => $districtName]);
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Barangays assigned to district successfully',
        ]);
    }
}
