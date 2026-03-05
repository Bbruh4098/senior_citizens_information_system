<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Traits\LogsAudit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    use LogsAudit;
    //Login user and create token.
    public function login(Request $request)
    {
        $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        $user = User::with(['role', 'branch', 'barangay'])
            ->where('username', $request->username)
            ->where('is_active', true)
            ->first();

        if (!$user || !Hash::check($request->password, $user->password_hash)) {
            throw ValidationException::withMessages([
                'username' => ['The provided credentials are incorrect.'],
            ]);
        }

        // Update last login
        $user->update(['last_login' => now()]);

        // Create token
        $token = $user->createToken('auth-token')->plainTextToken;

        // Audit log
        $this->logAudit('login', 'users', $user->id, "Admin {$user->username} logged in", null, null, $user->full_name);

        return response()->json([
            'success' => true,
            'message' => 'Login successful',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'employee_id' => $user->employee_id,
                    'username' => $user->username,
                    'full_name' => $user->full_name,
                    'email' => $user->email,
                    'position' => $user->position,
                    'role_id' => $user->role_id,
                    'role_name' => $user->role->name ?? null,
                    'role_level' => $user->role->level ?? null,
                    'branch_id' => $user->branch_id,
                    'branch_name' => $user->branch->name ?? null,
                    'barangay_id' => $user->barangay_id,
                    'barangay_name' => $user->barangay->name ?? null,
                ],
                'token' => $token,
            ],
        ]);
    }

    //Logout user (revoke token).
     
    public function logout(Request $request)
    {
        $user = $request->user();
        $this->logAudit('logout', 'users', $user->id, "Admin {$user->username} logged out", null, null, $user->full_name);

        $user->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully',
        ]);
    }

    // Get current authenticated user.
    public function me(Request $request)
    {
        $user = $request->user()->load(['role', 'branch', 'barangay']);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $user->id,
                'employee_id' => $user->employee_id,
                'username' => $user->username,
                'full_name' => $user->full_name,
                'email' => $user->email,
                'position' => $user->position,
                'role_id' => $user->role_id,
                'role_name' => $user->role->name ?? null,
                'role_level' => $user->role->level ?? null,
                'branch_id' => $user->branch_id,
                'branch_name' => $user->branch->name ?? null,
                'barangay_id' => $user->barangay_id,
                'barangay_name' => $user->barangay->name ?? null,
                'accessible_barangays' => $user->getAccessibleBarangayIds(),
            ],
        ]);
    }
}
