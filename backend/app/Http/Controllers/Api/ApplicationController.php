<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\SeniorCitizen;
use App\Models\Contact;
use App\Models\Barangay;
use App\Models\IdPrintingQueue;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ApplicationController extends Controller
{
    /**
     * Get paginated list of applications.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $perPage = $request->get('per_page', 10);
        
        $query = Application::with(['senior', 'senior.barangay', 'applicationType', 'submitter', 'approver'])
            ->when(!$user->isMainAdmin(), function ($q) use ($user) {
                // Non-main admins can only see applications from their accessible barangays
                $accessibleBarangayIds = $user->getAccessibleBarangayIds();

                $q->where(function ($subQ) use ($accessibleBarangayIds) {
                    // Applications with senior_id set (filter by senior's barangay)
                    $subQ->whereHas('senior', function ($sq) use ($accessibleBarangayIds) {
                        $sq->whereIn('barangay_id', $accessibleBarangayIds);
                    })
                    // OR applications without senior (pending/draft) - filter by applicant_data.personal_info.barangay_id
                    ->orWhere(function ($pendingQ) use ($accessibleBarangayIds) {
                        $pendingQ->whereNull('senior_id')
                            ->where(function ($barangayCheck) use ($accessibleBarangayIds) {
                                foreach ($accessibleBarangayIds as $barangayId) {
                                    $barangayCheck->orWhereRaw(
                                        "JSON_EXTRACT(applicant_data, '$.personal_info.barangay_id') = ?",
                                        [$barangayId]
                                    );
                                }
                            });
                    });
                });
            });

        // Status filter
        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }

        // Type filter (accept both type_id and application_type parameter names)
        if ($typeId = $request->get('type_id') ?? $request->get('application_type')) {
            $query->where('application_type_id', $typeId);
        }

        // Search by name or application number
        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('application_number', 'like', "%{$search}%")
                    ->orWhereHas('senior', function ($sq) use ($search) {
                        $sq->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%")
                            ->orWhere('osca_id', 'like', "%{$search}%");
                    })
                    // Also search in applicant_data JSON for pending applications
                    ->orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(applicant_data, '$.personal_info.first_name')) LIKE ?", ["%{$search}%"])
                    ->orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(applicant_data, '$.personal_info.last_name')) LIKE ?", ["%{$search}%"]);
            });
        }

        $query->orderBy('created_at', 'desc');

        $applications = $query->paginate($perPage);

        // Transform to include applicant name from applicant_data when senior doesn't exist
        $items = $applications->getCollection()->map(function ($app) {
            $data = $app->toArray();
            if (!$app->senior && $app->applicant_data) {
                $personal = $app->applicant_data['personal_info'] ?? [];
                $data['applicant_name'] = trim(
                    ($personal['first_name'] ?? '') . ' ' . 
                    ($personal['middle_name'] ?? '') . ' ' . 
                    ($personal['last_name'] ?? '')
                );
                // Also add barangay_name for pending apps
                if (isset($personal['barangay_id'])) {
                    $barangay = \App\Models\Barangay::find($personal['barangay_id']);
                    $data['barangay_name'] = $barangay ? $barangay->name : null;
                }
            } else if ($app->senior) {
                $data['applicant_name'] = $app->senior->full_name ?? 
                    "{$app->senior->first_name} {$app->senior->last_name}";
            } else {
                $data['applicant_name'] = 'Unknown';
            }
            return $data;
        });

        return response()->json([
            'success' => true,
            'data' => $items,
            'meta' => [
                'total' => $applications->total(),
                'per_page' => $applications->perPage(),
                'current_page' => $applications->currentPage(),
                'last_page' => $applications->lastPage(),
            ],
        ]);
    }

    /**
     * Get application by ID.
     */
    public function show(Request $request, $id)
    {
        $application = Application::with([
            'senior',
            'senior.barangay',
            'senior.gender',
            'senior.contact',
            'applicationType',
            'submitter',
            'verifier',
            'approver',
            'documents', // Include uploaded documents
        ])->findOrFail($id);

        $data = $application->toArray();

        // Add barangay_name and civil_status_name for pending apps without senior
        if (!$application->senior && $application->applicant_data) {
            $personal = $application->applicant_data['personal_info'] ?? [];
            if (isset($personal['barangay_id'])) {
                $barangay = \App\Models\Barangay::find($personal['barangay_id']);
                // Add barangay_name to the applicant_data.personal_info
                $data['applicant_data']['personal_info']['barangay_name'] = $barangay ? $barangay->name : null;
            }
        } elseif ($application->senior && $application->senior->barangay) {
            // For apps with senior, include barangay name in applicant_data too
            if (!isset($data['applicant_data']['personal_info'])) {
                $data['applicant_data']['personal_info'] = [];
            }
            $data['applicant_data']['personal_info']['barangay_name'] = $application->senior->barangay->name;
        }

        // Always resolve civil_status_name from personal_info for any app type
        if ($application->applicant_data) {
            $personal = $application->applicant_data['personal_info'] ?? [];
            if (isset($personal['civil_status_id']) && !isset($data['applicant_data']['personal_info']['civil_status_name'])) {
                $civilStatus = \App\Models\CivilStatus::find($personal['civil_status_id']);
                if (!isset($data['applicant_data']['personal_info'])) {
                    $data['applicant_data']['personal_info'] = $personal;
                }
                $data['applicant_data']['personal_info']['civil_status_name'] = $civilStatus ? $civilStatus->name : null;
            }
        }

        // Always resolve educational_attainment_name from background_info
        if ($application->applicant_data) {
            $background = $application->applicant_data['background_info'] ?? [];
            if (isset($background['educational_attainment_id']) && !isset($data['applicant_data']['background_info']['educational_attainment_name'])) {
                $ea = \App\Models\EducationalAttainment::find($background['educational_attainment_id']);
                if (!isset($data['applicant_data']['background_info'])) {
                    $data['applicant_data']['background_info'] = $background;
                }
                $data['applicant_data']['background_info']['educational_attainment_name'] = $ea ? $ea->level : null;
            }
        }

        // Auto-match family members to registered seniors (admin-side enrichment)
        if ($application->applicant_data && !empty($data['applicant_data']['family_members'])) {
            $familyMembers = $data['applicant_data']['family_members'];
            foreach ($familyMembers as $index => $member) {
                $firstName = strtolower(trim($member['first_name'] ?? ''));
                $lastName = strtolower(trim($member['last_name'] ?? ''));
                $birthdate = $member['birthdate'] ?? null;

                if ($firstName && $lastName) {
                    $query = SeniorCitizen::whereRaw('LOWER(TRIM(first_name)) = ?', [$firstName])
                        ->whereRaw('LOWER(TRIM(last_name)) = ?', [$lastName])
                        ->where('is_active', true);

                    if ($birthdate) {
                        $query->whereDate('birthdate', $birthdate);
                    }

                    $match = $query->with('barangay')->first();

                    if ($match) {
                        $familyMembers[$index]['matched_senior'] = [
                            'id' => $match->id,
                            'osca_id' => $match->osca_id,
                            'full_name' => $match->full_name,
                            'barangay' => $match->barangay?->name,
                            'birthdate' => $match->birthdate?->format('Y-m-d'),
                        ];
                    }
                }
            }
            $data['applicant_data']['family_members'] = $familyMembers;
        }

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    // Update application notes/remarks.
    public function updateNotes(Request $request, $id)
    {
        $request->validate([
            'notes' => 'nullable|string|max:1000',
        ]);

        $application = Application::findOrFail($id);
        $application->update(['notes' => $request->notes]);

        return response()->json([
            'success' => true,
            'message' => 'Remarks updated successfully',
            'data' => $application,
        ]);
    }

    /**
     * Update application status.
     * When approving, create the senior_citizen record from applicant_data.
     */
    public function updateStatus(Request $request, $id)
    {
        $user = $request->user();
        
        // ==============================================
        // ROLE-BASED STATUS RESTRICTIONS
        // ==============================================
        // FO (role_id=2) can only: Draft, For Verification, Rejected
        // Only MAIN (role_id=1) can: Approve, Print, Claim
        $mainOnlyStatuses = ['Approved', 'Printed', 'Claimed'];
        if ($user->role_id !== 1 && in_array($request->status, $mainOnlyStatuses)) {
            return response()->json([
                'success' => false,
                'message' => 'Only OSCA Main can approve, print, or claim applications. Please transmit to Main Office for approval.',
                'required_action' => 'transmit_to_main',
            ], 403);
        }
        // ==============================================

        $request->validate([
            'status' => 'required|in:Pending,Draft,For Verification,Verified,Approved,Rejected,Printed,Claimed',
            'rejection_reason' => 'nullable|required_if:status,Rejected|string|max:500',
        ]);

        $application = Application::findOrFail($id);

        try {
            DB::beginTransaction();

            $updateData = ['status' => $request->status];

            // Set action-specific fields based on status
            switch ($request->status) {
                case 'For Verification':
                    $updateData['submission_date'] = now();
                    break;

                case 'Verified':
                    $updateData['verified_by'] = $user->id;
                    $updateData['verification_date'] = now();
                    break;
                    
                case 'Approved':
                    // ==============================================
                    // STRICT DUPLICATE CHECK BEFORE APPROVAL
                    // Only for NEW registrations (where senior_id is null)
                    // ==============================================
                    if (!$application->senior_id && $application->applicant_data) {
                        $personalInfo = $application->applicant_data['personal_info'] ?? [];
                        $firstName = strtolower(trim($personalInfo['first_name'] ?? ''));
                        $lastName = strtolower(trim($personalInfo['last_name'] ?? ''));
                        $birthdate = $personalInfo['birthdate'] ?? null;

                        if ($firstName && $lastName && $birthdate) {
                            $existingSenior = SeniorCitizen::whereRaw('LOWER(TRIM(first_name)) = ?', [$firstName])
                                ->whereRaw('LOWER(TRIM(last_name)) = ?', [$lastName])
                                ->whereDate('birthdate', $birthdate)
                                ->first();

                            if ($existingSenior) {
                                return response()->json([
                                    'success' => false,
                                    'message' => 'Cannot approve: This person is already registered with OSCA ID: ' . $existingSenior->osca_id . ' in Barangay ' . ($existingSenior->barangay?->name ?? 'Unknown') . '. This may be a duplicate registration attempt.',
                                    'duplicate' => [
                                        'osca_id' => $existingSenior->osca_id,
                                        'name' => "{$existingSenior->first_name} {$existingSenior->last_name}",
                                        'barangay' => $existingSenior->barangay?->name,
                                    ],
                                ], 409);
                            }
                        }
                    }
                    // ==============================================
                    
                    // NEW REGISTRATION: Create senior_citizen from applicant_data
                    if (!$application->senior_id && $application->applicant_data) {
                        $seniorId = $this->createSeniorFromApplication($application, $user);
                        $updateData['senior_id'] = $seniorId;
                    } else if ($application->senior_id && $application->senior) {
                        // RENEWAL: Update existing senior with any changed info from applicant_data
                        $this->updateSeniorFromRenewal($application, $user);
                        $seniorId = $application->senior_id;
                    }
                    $updateData['approved_by'] = $user->id;
                    $updateData['approval_date'] = now();

                    // Auto-add to ID printing queue
                    if (isset($seniorId)) {
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

                        IdPrintingQueue::create([
                            'senior_id' => $seniorId,
                            'application_id' => $application->id,
                            'queue_number' => $queueNumber,
                            'id_type' => match((int) $application->application_type_id) {
                                1 => 'new',
                                2 => 'renewal',
                                3 => 'replace_lost',
                                4 => 'replace_damaged',
                                default => 'new',
                            },
                            'status' => 'pending',
                            'priority' => 'normal',
                            'requested_by' => $user->id,
                            'requested_date' => now(),
                        ]);
                    }
                    break;
                    
                case 'Rejected':
                    $updateData['notes'] = ($application->notes ?? '') . 
                        "\nRejection Reason: " . $request->rejection_reason;
                    break;
                    
                case 'Printed':
                    $updateData['printed_by'] = $user->id;
                    $updateData['print_date'] = now();
                    break;
                    
                case 'Claimed':
                    $updateData['claimed_by'] = $user->id;
                    $updateData['claim_date'] = now();
                    break;
            }

            $application->update($updateData);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Application status updated successfully',
                'data' => $application->fresh(['senior', 'applicationType']),
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to update status: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Create senior citizen record from application's applicant_data.
     */
    private function createSeniorFromApplication(Application $application, $user): int
    {
        $data = $application->applicant_data;
        $personal = $data['personal_info'] ?? [];
        $contact = $data['contact_info'] ?? [];
        $background = $data['background_info'] ?? [];
        $familyMembers = $data['family_members'] ?? [];

        // Create contact record
        $contactRecord = Contact::create([
            'mobile_number' => $contact['mobile_number'] ?? null,
            'telephone_number' => $contact['telephone_number'] ?? null,
            'email' => $contact['email'] ?? null,
            'house_number' => $contact['house_number'] ?? null,
            'street' => $contact['street'] ?? null,
            'barangay_id' => $personal['barangay_id'] ?? null,
            'city' => 'Zamboanga City',
            'postal_code' => '7000',
        ]);

        // Get branch from barangay
        $barangay = Barangay::with('branches')->find($personal['barangay_id']);
        $branchId = $barangay?->branches?->first()?->id;

        // Generate OSCA ID
        $oscaId = $this->generateOscaId();

        // Create senior citizen
        $senior = SeniorCitizen::create([
            'osca_id' => $oscaId,
            'first_name' => $personal['first_name'] ?? '',
            'middle_name' => $personal['middle_name'] ?? null,
            'last_name' => $personal['last_name'] ?? '',
            'extension' => $personal['extension'] ?? null,
            'birthdate' => $personal['birthdate'] ?? null,
            'gender_id' => $personal['gender_id'] ?? 1,
            'civil_status_id' => $personal['civil_status_id'] ?? null,
            'barangay_id' => $personal['barangay_id'] ?? null,
            'branch_id' => $branchId,
            'contact_id' => $contactRecord->id,
            'educational_attainment_id' => $background['educational_attainment_id'] ?? null,
            'monthly_salary' => $background['monthly_salary'] ?? 0,
            'occupation' => $background['occupation'] ?? null,
            'other_skills' => $background['other_skills'] ?? null,
            'target_sectors' => $data['target_sectors'] ?? [],
            'sub_categories' => $data['sub_categories'] ?? [],
            'registration_date' => now(),
            'registration_status_id' => 2, // Approved
            'registered_by' => $user->id,
            'is_active' => true,
            'is_deceased' => false,
        ]);

        // Create family members
        if (!empty($familyMembers)) {
            foreach ($familyMembers as $member) {
                if (!empty($member['first_name'])) {
                    $birthdate = $member['birthdate'] ?? null;
                    $age = $member['age'] ?? null;
                    
                    // Auto-compute age from birthdate if available
                    if ($birthdate) {
                        $age = \Carbon\Carbon::parse($birthdate)->age;
                    }

                    DB::table('family_members')->insert([
                        'senior_id' => $senior->id,
                        'first_name' => $member['first_name'] ?? '',
                        'middle_name' => $member['middle_name'] ?? null,
                        'last_name' => $member['last_name'] ?? '',
                        'extension' => $member['extension'] ?? null,
                        'birthdate' => $birthdate,
                        'relationship' => $member['relationship'] ?? null,
                        'age' => $age,
                        'monthly_salary' => $member['monthly_salary'] ?? null,
                        'mobile_number' => $member['mobile_number'] ?? null,
                        'telephone_number' => $member['telephone_number'] ?? null,
                        'email' => $member['email'] ?? null,
                        'created_at' => now(),
                    ]);
                }
            }
        }

        return $senior->id;
    }

    /**
     * Update existing senior citizen from renewal application's applicant_data.
     * This applies any updated info (address, phone, etc.) while preserving the OSCA ID.
     */
    private function updateSeniorFromRenewal(Application $application, $user): void
    {
        $senior = $application->senior;
        if (!$senior) {
            return;
        }

        $data = $application->applicant_data;
        $personal = $data['personal_info'] ?? [];
        $contact = $data['contact_info'] ?? [];
        $background = $data['background_info'] ?? [];

        // Update senior's personal info (preserving osca_id)
        $senior->update([
            'first_name' => $personal['first_name'] ?? $senior->first_name,
            'middle_name' => $personal['middle_name'] ?? $senior->middle_name,
            'last_name' => $personal['last_name'] ?? $senior->last_name,
            'extension' => $personal['extension'] ?? $senior->extension,
            'birthdate' => $personal['birthdate'] ?? $senior->birthdate,
            'gender_id' => $personal['gender_id'] ?? $senior->gender_id,
            'civil_status_id' => $personal['civil_status_id'] ?? $senior->civil_status_id,
            'barangay_id' => $personal['barangay_id'] ?? $senior->barangay_id,
            'educational_attainment_id' => $background['educational_attainment_id'] ?? $senior->educational_attainment_id,
            'monthly_salary' => $background['monthly_salary'] ?? $senior->monthly_salary,
            'occupation' => $background['occupation'] ?? $senior->occupation,
            'other_skills' => $background['other_skills'] ?? $senior->other_skills,
            'registration_status_id' => 2, // Approved
            'is_active' => true,
        ]);

        // Update contact info if exists
        if ($senior->contact) {
            $senior->contact->update([
                'mobile_number' => $contact['mobile_number'] ?? $senior->contact->mobile_number,
                'telephone_number' => $contact['telephone_number'] ?? $senior->contact->telephone_number,
                'email' => $contact['email'] ?? $senior->contact->email,
                'house_number' => $contact['house_number'] ?? $senior->contact->house_number,
                'street' => $contact['street'] ?? $senior->contact->street,
                'barangay_id' => $personal['barangay_id'] ?? $senior->contact->barangay_id,
            ]);
        }
    }

    /**
     * Generate OSCA ID for new senior citizen.
     */
    private function generateOscaId(): string
    {
        $year = date('Y');
        $prefix = 'ZC-' . $year . '-';
        
        $lastSenior = SeniorCitizen::where('osca_id', 'like', $prefix . '%')
            ->orderBy('osca_id', 'desc')
            ->first();
        
        if ($lastSenior) {
            $lastNumber = (int) str_replace($prefix, '', $lastSenior->osca_id);
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1001;
        }
        
        return $prefix . str_pad($newNumber, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Get application statistics.
     */
    public function statistics(Request $request)
    {
        $user = $request->user();

        $baseQuery = Application::query()
            ->when($user->role_id !== 1, function ($q) use ($user) {
                $accessibleBarangayIds = $user->getAccessibleBarangayIds();
                
                $q->where(function ($subQ) use ($user, $accessibleBarangayIds) {
                    // Applications with senior_id set (filter by senior's barangay)
                    $subQ->whereHas('senior', function ($sq) use ($accessibleBarangayIds) {
                        $sq->whereIn('barangay_id', $accessibleBarangayIds);
                    })
                    // OR applications without senior (pending/draft) - filter by applicant_data.personal_info.barangay_id
                    ->orWhere(function ($pendingQ) use ($accessibleBarangayIds) {
                        $pendingQ->whereNull('senior_id')
                            ->where(function ($barangayCheck) use ($accessibleBarangayIds) {
                                foreach ($accessibleBarangayIds as $barangayId) {
                                    $barangayCheck->orWhereRaw(
                                        "JSON_EXTRACT(applicant_data, '$.personal_info.barangay_id') = ?",
                                        [$barangayId]
                                    );
                                }
                            });
                    });
                });
            });

        $stats = [
            'total' => (clone $baseQuery)->count(),
            'pending' => (clone $baseQuery)->where('status', 'Draft')->count(), // Draft = pending action from staff
            'for_verification' => (clone $baseQuery)->where('status', 'For Verification')->count(),
            'approved' => (clone $baseQuery)->where('status', 'Approved')->count(),
            'rejected' => (clone $baseQuery)->where('status', 'Rejected')->count(),
            'printed' => (clone $baseQuery)->where('status', 'Printed')->count(),
            'claimed' => (clone $baseQuery)->where('status', 'Claimed')->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }
}
