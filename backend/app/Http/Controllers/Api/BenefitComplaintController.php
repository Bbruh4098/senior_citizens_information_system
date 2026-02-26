<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BenefitComplaint;
use App\Models\SeniorCitizen;
use App\Traits\LogsAudit;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class BenefitComplaintController extends Controller
{
    use LogsAudit;

    // File a new complaint (senior portal).
    public function seniorStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'senior_id' => 'required|exists:senior_citizens,id',
            'category' => 'required|string|in:benefit,service,facility,staff,other',
            'benefit_claim_id' => 'nullable|exists:benefit_claims,id',
            'subject' => 'required|string|max:255',
            'message' => 'required|string|max:2000',
        ]);

        $complaint = BenefitComplaint::create([
            'senior_id' => $validated['senior_id'],
            'category' => $validated['category'],
            'benefit_claim_id' => $validated['benefit_claim_id'] ?? null,
            'subject' => $validated['subject'],
            'message' => $validated['message'],
            'status' => 'open',
        ]);

        $complaint->load('claim.benefitType');

        return response()->json([
            'success' => true,
            'message' => 'Complaint filed successfully',
            'data' => $complaint,
        ], 201);
    }

    //List complaints for a specific senior (senior portal).
    public function seniorIndex(Request $request): JsonResponse
    {
        $request->validate([
            'senior_id' => 'required|exists:senior_citizens,id',
        ]);

        $complaints = BenefitComplaint::where('senior_id', $request->senior_id)
            ->with(['claim.benefitType'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($complaint) {
                return [
                    'id' => $complaint->id,
                    'category' => $complaint->category,
                    'category_label' => self::getCategoryLabel($complaint->category),
                    'subject' => $complaint->subject,
                    'message' => $complaint->message,
                    'status' => $complaint->status,
                    'status_label' => $complaint->status_label,
                    'benefit_name' => $complaint->claim?->benefitType?->name ?? null,
                    'admin_response' => $complaint->admin_response,
                    'responded_at' => $complaint->responded_at?->format('M d, Y h:i A'),
                    'created_at' => $complaint->created_at->format('M d, Y h:i A'),
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $complaints,
        ]);
    }



    // ADMIN PORTAL ENDPOINTS 

    // List all complaints with filters and pagination.
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = BenefitComplaint::with([
            'senior',
            'claim.benefitType',
            'respondedBy',
        ]);

        // Filter by status
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Filter by category
        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        // Search by senior name or OSCA ID
        if ($request->filled('search')) {
            $search = $request->search;
            $query->whereHas('senior', function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('osca_id', 'like', "%{$search}%");
            });
        }

        $complaints = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        $complaints->getCollection()->transform(function ($complaint) {
            return [
                'id' => $complaint->id,
                'category' => $complaint->category,
                'category_label' => self::getCategoryLabel($complaint->category),
                'senior_name' => $complaint->senior
                    ? "{$complaint->senior->first_name} {$complaint->senior->last_name}"
                    : 'Unknown',
                'osca_id' => $complaint->senior?->osca_id ?? '—',
                'subject' => $complaint->subject,
                'message' => $complaint->message,
                'benefit_name' => $complaint->claim?->benefitType?->name ?? null,
                'claim_amount' => $complaint->claim?->amount ?? null,
                'status' => $complaint->status,
                'admin_response' => $complaint->admin_response,
                'responded_by_name' => $complaint->respondedBy?->name ?? null,
                'responded_at' => $complaint->responded_at?->format('M d, Y h:i A'),
                'created_at' => $complaint->created_at->format('M d, Y h:i A'),
                'created_at_raw' => $complaint->created_at,
            ];
        });

        // Get statistics
        $stats = [
            'total' => BenefitComplaint::count(),
            'open' => BenefitComplaint::where('status', 'open')->count(),
            'in_review' => BenefitComplaint::where('status', 'in_review')->count(),
            'resolved' => BenefitComplaint::where('status', 'resolved')->count(),
            'closed' => BenefitComplaint::where('status', 'closed')->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => $complaints->items(),
            'pagination' => [
                'current_page' => $complaints->currentPage(),
                'per_page' => $complaints->perPage(),
                'total' => $complaints->total(),
                'last_page' => $complaints->lastPage(),
            ],
            'statistics' => $stats,
        ]);
    }

    // View a single complaint.
    public function show(Request $request, $id): JsonResponse
    {
        $complaint = BenefitComplaint::with([
            'senior',
            'claim.benefitType',
            'respondedBy',
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $complaint->id,
                'category' => $complaint->category,
                'category_label' => self::getCategoryLabel($complaint->category),
                'senior_name' => $complaint->senior
                    ? "{$complaint->senior->first_name} {$complaint->senior->last_name}"
                    : 'Unknown',
                'osca_id' => $complaint->senior?->osca_id ?? '—',
                'subject' => $complaint->subject,
                'message' => $complaint->message,
                'benefit_name' => $complaint->claim?->benefitType?->name ?? null,
                'claim_amount' => $complaint->claim?->amount ?? null,
                'status' => $complaint->status,
                'admin_response' => $complaint->admin_response,
                'responded_by_name' => $complaint->respondedBy?->name ?? null,
                'responded_at' => $complaint->responded_at?->format('M d, Y h:i A'),
                'created_at' => $complaint->created_at->format('M d, Y h:i A'),
            ],
        ]);
    }

    // Respond to a complaint (admin).
    public function respond(Request $request, $id): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'status' => 'required|in:in_review,resolved,closed',
            'admin_response' => 'nullable|string|max:2000',
        ]);

        $complaint = BenefitComplaint::findOrFail($id);
        $complaint->status = $validated['status'];

        if (!empty($validated['admin_response'])) {
            $complaint->admin_response = $validated['admin_response'];
            $complaint->responded_by = $user->id;
            $complaint->responded_at = now();
        }

        $complaint->save();
        $complaint->load('senior');

        $seniorName = $complaint->senior
            ? "{$complaint->senior->first_name} {$complaint->senior->last_name}"
            : 'Unknown';
        $actionKey = 'complaint_' . $validated['status'];
        $this->logAudit(
            $actionKey, 'benefit_complaints', $complaint->id,
            "Complaint " . str_replace('_', ' ', $validated['status']) . ": {$complaint->subject}",
            null,
            ['status' => $validated['status']],
            $seniorName
        );

        return response()->json([
            'success' => true,
            'message' => 'Complaint updated successfully',
        ]);
    }

    // Get human-readable category label.
    private static function getCategoryLabel(string $category): string
    {
        return match($category) {
            'benefit' => 'Benefit Issue',
            'service' => 'Service Concern',
            'facility' => 'Facility Issue',
            'staff' => 'Staff Concern',
            'other' => 'Other',
            default => ucfirst($category),
        };
    }
}
