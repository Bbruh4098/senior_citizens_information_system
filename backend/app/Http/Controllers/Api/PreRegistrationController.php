<?php

namespace App\Http\Controllers\Api;

use App\Models\PreRegistration;
use App\Models\Application;
use App\Traits\LogsAudit;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class PreRegistrationController extends Controller
{
    use LogsAudit;
    /**
     * List pre-registrations with filters
     */
    public function index(Request $request): JsonResponse
    {
        $query = PreRegistration::with(['barangay', 'foReviewer', 'mainReviewer']);

        // Filter by status
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Filter by barangay
        if ($request->filled('barangay_id')) {
            $query->where('barangay_id', $request->barangay_id);
        }

        // Search by reference number or applicant name
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('reference_number', 'like', "%{$search}%")
                  ->orWhereRaw("JSON_EXTRACT(applicant_data, '$.first_name') LIKE ?", ["%{$search}%"])
                  ->orWhereRaw("JSON_EXTRACT(applicant_data, '$.last_name') LIKE ?", ["%{$search}%"]);
            });
        }

        // Role-based filtering
        $user = $request->user();
        if (!$user->isMainAdmin()) {
            $barangayIds = $user->getAccessibleBarangayIds();
            $query->whereIn('barangay_id', $barangayIds);
        }

        $preRegistrations = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return response()->json($preRegistrations);
    }

    /**
     * Get statistics
     */
    public function statistics(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = PreRegistration::query();

        // Role-based filtering - filter for non-main admins
        if (!$user->isMainAdmin()) {
            $barangayIds = $user->getAccessibleBarangayIds();
            $query->whereIn('barangay_id', $barangayIds);
        }

        $stats = [
            'total' => (clone $query)->count(),
            'pending' => (clone $query)->where('status', 'pending')->count(),
            'fo_review' => (clone $query)->where('status', 'fo_review')->count(),
            'fo_verified' => (clone $query)->where('status', 'fo_verified')->count(),
            'main_review' => (clone $query)->where('status', 'main_review')->count(),
            'approved' => (clone $query)->where('status', 'approved')->count(),
            'rejected' => (clone $query)->where('status', 'rejected')->count(),
            'converted' => (clone $query)->where('status', 'converted')->count(),
            'today' => (clone $query)->whereDate('created_at', today())->count(),
            'this_week' => (clone $query)->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])->count(),
        ];

        return response()->json(['data' => $stats]);
    }

    /**
     * Get single pre-registration
     */
    public function show(int $id): JsonResponse
    {
        $preRegistration = PreRegistration::with(['barangay', 'foReviewer', 'mainReviewer', 'application'])
            ->findOrFail($id);

        return response()->json(['data' => $preRegistration]);
    }

    /**
     * Update status (FO review) - transmit to Main or reject
     */
    public function foReview(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'action' => 'required|in:verify,transmit,reject',
            'notes' => 'nullable|string|max:500',
            'rejection_reason' => 'required_if:action,reject|nullable|string|max:500',
        ]);

        $preReg = PreRegistration::findOrFail($id);

        if (!in_array($preReg->status, ['pending', 'fo_review'])) {
            return response()->json(['message' => 'Cannot review this application at current status'], 422);
        }

        $user = $request->user();

        // 'verify' and 'transmit' do the same thing - forward to Main
        if (in_array($request->action, ['verify', 'transmit'])) {
            $preReg->update([
                'status' => PreRegistration::STATUS_FO_VERIFIED,
                'fo_reviewed_by' => $user->id,
                'fo_reviewed_at' => now(),
                'notes' => $request->notes,
            ]);
            $message = 'Application transmitted to Main Admin';
        } else {
            $preReg->update([
                'status' => PreRegistration::STATUS_REJECTED,
                'fo_reviewed_by' => $user->id,
                'fo_reviewed_at' => now(),
                'rejection_reason' => $request->rejection_reason,
            ]);
            $message = 'Application rejected';
        }

        $applicantData = $preReg->applicant_data;
        $applicantName = ($applicantData['first_name'] ?? '') . ' ' . ($applicantData['last_name'] ?? '');
        $actionKey = in_array($request->action, ['verify', 'transmit']) ? 'prereg_fo_verified' : 'prereg_fo_rejected';
        $this->logAudit(
            $actionKey, 'pre_registrations', $preReg->id,
            ($actionKey === 'prereg_fo_verified' ? 'FO verified' : 'FO rejected') . ": {$applicantName} ({$preReg->reference_number})",
            null, ['status' => $preReg->status],
            trim($applicantName)
        );

        return response()->json([
            'message' => $message,
            'data' => $preReg->fresh(['barangay', 'foReviewer']),
        ]);
    }

    /**
     * Main Admin review
     */
    public function mainReview(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'action' => 'required|in:approve,reject',
            'notes' => 'nullable|string|max:500',
            'rejection_reason' => 'required_if:action,reject|nullable|string|max:500',
        ]);

        $preReg = PreRegistration::findOrFail($id);

        if (!in_array($preReg->status, ['fo_verified', 'main_review'])) {
            return response()->json(['message' => 'Cannot review this application at current status'], 422);
        }

        $user = $request->user();

        if ($request->action === 'approve') {
            $preReg->update([
                'status' => PreRegistration::STATUS_APPROVED,
                'main_reviewed_by' => $user->id,
                'main_reviewed_at' => now(),
                'notes' => $request->notes,
            ]);
            $message = 'Application approved. Ready for conversion.';
        } else {
            $preReg->update([
                'status' => PreRegistration::STATUS_REJECTED,
                'main_reviewed_by' => $user->id,
                'main_reviewed_at' => now(),
                'rejection_reason' => $request->rejection_reason,
            ]);
            $message = 'Application rejected';
        }

        $applicantData = $preReg->applicant_data;
        $applicantName = ($applicantData['first_name'] ?? '') . ' ' . ($applicantData['last_name'] ?? '');
        $actionKey = $request->action === 'approve' ? 'prereg_approved' : 'prereg_rejected';
        $this->logAudit(
            $actionKey, 'pre_registrations', $preReg->id,
            ($request->action === 'approve' ? 'Application approved' : 'Application rejected') . ": {$applicantName} ({$preReg->reference_number})",
            null, ['status' => $preReg->status],
            trim($applicantName)
        );

        return response()->json([
            'message' => $message,
            'data' => $preReg->fresh(['barangay', 'foReviewer', 'mainReviewer']),
        ]);
    }

    /**
     * Convert approved/transmitted pre-registration to full application.
     * Returns data formatted for the registration form (Option A - pre-fill form).
     */
    public function convert(Request $request, int $id): JsonResponse
    {
        $preReg = PreRegistration::with('barangay')->findOrFail($id);

        // Allow conversion for any application that is not already converted or rejected
        if (in_array($preReg->status, [PreRegistration::STATUS_CONVERTED, PreRegistration::STATUS_REJECTED])) {
            return response()->json(['message' => 'This application has already been ' . $preReg->status], 422);
        }

        // Transform applicant_data from online form format to registration form format
        $onlineData = $preReg->applicant_data;
        
        // Handle gender_id - form sends it directly as integer
        $genderId = null;
        if (isset($onlineData['gender_id'])) {
            $genderId = (int) $onlineData['gender_id'];
        } elseif (isset($onlineData['sex'])) {
            // Fallback: Map sex string to gender_id
            $gender = \App\Models\Gender::whereRaw('LOWER(name) = ?', [strtolower($onlineData['sex'])])->first();
            $genderId = $gender ? $gender->id : null;
        }

        // Build registration form data structure
        $registrationData = [
            // Personal Info
            'first_name' => $onlineData['first_name'] ?? '',
            'middle_name' => $onlineData['middle_name'] ?? '',
            'last_name' => $onlineData['last_name'] ?? '',
            'extension' => $onlineData['extension'] ?? $onlineData['suffix'] ?? '',
            'birthdate' => $onlineData['birthdate'] ?? '',
            'gender_id' => $genderId,
            'barangay_id' => $preReg->barangay_id,
            
            // Contact Info
            'house_number' => $onlineData['house_number'] ?? '',
            'street' => $onlineData['street'] ?? $onlineData['address'] ?? '',
            'mobile_number' => $onlineData['mobile_number'] ?? $onlineData['contact_number'] ?? '',
            'telephone_number' => $onlineData['telephone_number'] ?? '',
            
            // Background
            'educational_attainment_id' => $onlineData['educational_attainment_id'] ?? null,
            'monthly_salary' => $onlineData['monthly_salary'] ?? null,
            'occupation' => $onlineData['occupation'] ?? '',
            'other_skills' => $onlineData['other_skills'] ?? '',
            
            // Family/emergency contact
            'emergency_contact' => [
                'name' => $onlineData['emergency_contact_name'] ?? '',
                'contact_number' => $onlineData['emergency_contact_number'] ?? '',
            ],
            
            // Additional online data for reference
            'civil_status_id' => $onlineData['civil_status_id'] ?? null,
            'email' => $onlineData['email'] ?? '',
            
            // Family & Associations from online form
            'family_members' => $onlineData['family_members'] ?? [],
            'target_sectors' => $onlineData['target_sectors'] ?? [],
            'sub_categories' => $onlineData['sub_categories'] ?? [],
        ];

        // Mark as being converted (optional status update)
        $preReg->update([
            'status' => PreRegistration::STATUS_MAIN_REVIEW,
            'main_reviewed_by' => $request->user()->id,
            'main_reviewed_at' => now(),
        ]);

        return response()->json([
            'message' => 'Pre-registration data retrieved for conversion',
            'data' => [
                'pre_registration_id' => $preReg->id,
                'reference_number' => $preReg->reference_number,
                'registration_data' => $registrationData,
                'barangay' => $preReg->barangay,
            ],
        ]);
    }

    /**
     * Mark as under review (optional status change)
     */
    public function markUnderReview(Request $request, int $id): JsonResponse
    {
        $preReg = PreRegistration::findOrFail($id);
        $user = $request->user();

        if ($preReg->status === 'pending' && in_array($user->role_id, [2, 3])) {
            $preReg->update(['status' => PreRegistration::STATUS_FO_REVIEW]);
        } elseif ($preReg->status === 'fo_verified' && $user->role_id === 1) {
            $preReg->update(['status' => PreRegistration::STATUS_MAIN_REVIEW]);
        }

        return response()->json([
            'message' => 'Status updated',
            'data' => $preReg->fresh(),
        ]);
    }

    /**
     * Complete the conversion - mark pre-registration as converted and link to application.
     * Called after registration form is successfully saved.
     */
    public function completeConversion(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'application_id' => 'required|exists:applications,id',
        ]);

        $preReg = PreRegistration::findOrFail($id);

        if ($preReg->status === PreRegistration::STATUS_CONVERTED) {
            return response()->json(['message' => 'Already converted'], 422);
        }

        $preReg->update([
            'status' => PreRegistration::STATUS_CONVERTED,
            'application_id' => $request->application_id,
        ]);

        return response()->json([
            'message' => 'Pre-registration marked as converted',
            'data' => $preReg->fresh(),
        ]);
    }
}
