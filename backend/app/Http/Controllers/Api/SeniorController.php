<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Archive;
use App\Models\DeceasedReport;
use App\Models\SeniorCitizen;
use App\Traits\LogsAudit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SeniorController extends Controller
{
    use LogsAudit;
    /**
     * Get paginated list of seniors.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $perPage = $request->get('per_page', 10);
        
        $query = SeniorCitizen::with(['barangay', 'branch', 'gender', 'civilStatus', 'registrationStatus'])
            ->accessibleBy($user);

        // Search filter
        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('osca_id', 'like', "%{$search}%")
                    ->orWhere('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('middle_name', 'like', "%{$search}%");
            });
        }

        // Barangay filter (single or multi)
        if ($barangayParam = $request->get('barangay_id')) {
            $barangayIds = is_array($barangayParam) ? $barangayParam : explode(',', $barangayParam);
            $barangayIds = array_values(array_filter(array_map('trim', $barangayIds)));
            if (!empty($barangayIds)) {
                $query->whereIn('barangay_id', $barangayIds);
            }
        }

        // District filter (single or multi)
        if ($districtParam = $request->get('district')) {
            $districts = is_array($districtParam) ? $districtParam : explode(',', $districtParam);
            $districts = array_values(array_filter(array_map('trim', $districts)));
            if (!empty($districts)) {
                $query->whereHas('barangay', function ($q) use ($districts) {
                    $q->whereIn('district', $districts);
                });
            }
        }

        // Status filter (single or multi)
        if ($statusParam = $request->get('status')) {
            $statuses = is_array($statusParam) ? $statusParam : explode(',', $statusParam);
            $statuses = array_values(array_filter(array_map('trim', $statuses)));

            if (!empty($statuses) && !in_array('all', $statuses, true)) {
                $query->where(function ($statusQuery) use ($statuses) {
                    if (in_array('active', $statuses, true)) {
                        $statusQuery->orWhere(function ($q) {
                            $q->where('is_active', true)->where('is_deceased', false);
                        });
                    }
                    if (in_array('inactive', $statuses, true)) {
                        $statusQuery->orWhere(function ($q) {
                            $q->where('is_active', false)->where('is_deceased', false);
                        });
                    }
                    if (in_array('deceased', $statuses, true)) {
                        $statusQuery->orWhere('is_deceased', true);
                    }
                });
            }
        }

        // Gender filter (single or multi)
        if ($genderParam = $request->get('gender_id')) {
            $genderIds = is_array($genderParam) ? $genderParam : explode(',', $genderParam);
            $genderIds = array_values(array_filter(array_map('trim', $genderIds)));
            if (!empty($genderIds)) {
                $query->whereIn('gender_id', $genderIds);
            }
        }

        // Age categories filter
        if ($ageCategories = $request->get('age_categories')) {
            $categories = is_array($ageCategories) ? $ageCategories : explode(',', $ageCategories);
            
            $query->where(function ($q) use ($categories) {
                foreach ($categories as $category) {
                    $category = trim($category);
                    switch ($category) {
                        case 'sexagenarians':
                            $q->orWhereRaw('TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) BETWEEN 60 AND 69');
                            break;
                        case 'septuagenarians':
                            $q->orWhereRaw('TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) BETWEEN 70 AND 79');
                            break;
                        case 'octogenarians':
                            $q->orWhereRaw('TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) BETWEEN 80 AND 89');
                            break;
                        case 'nonagenarians':
                            $q->orWhereRaw('TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) BETWEEN 90 AND 99');
                            break;
                        case 'centenarians':
                            $q->orWhereRaw('TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) >= 100');
                            break;
                    }
                }
            });
        }

        // Age range filter
        if ($minAge = $request->get('min_age')) {
            $maxDate = now()->subYears($minAge)->format('Y-m-d');
            $query->where('birthdate', '<=', $maxDate);
        }
        if ($maxAge = $request->get('max_age')) {
            $minDate = now()->subYears($maxAge + 1)->format('Y-m-d');
            $query->where('birthdate', '>', $minDate);
        }

        // Sorting
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        $seniors = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $seniors,
        ]);
    }

    /**
     * Get a single senior by ID.
     */
    public function show(Request $request, $id)
    {
        try {
            $user = $request->user();
            
            $senior = SeniorCitizen::with([
                'barangay',
                'branch',
                'gender',
                'civilStatus',
                'contact',
                'educationalAttainment',
                'socioeconomicStatus',
                'mobilityLevel',
                'registrationStatus',
                'registeredBy',
                'applications.applicationType',
                'applications.submitter',
                'applications.approver',
                'seniorIds',
                'familyMembers',
                'healthProfile',
                'deceasedReport',
            ])
                ->accessibleBy($user)
                ->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $senior,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Senior not found or not accessible',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Error fetching senior: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to load senior information: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get statistics for seniors.
     */
    public function statistics(Request $request)
    {
        $user = $request->user();
        $barangayIds = $user->getAccessibleBarangayIds();

        $baseQuery = SeniorCitizen::query();
        if (!$user->isMainAdmin()) {
            $baseQuery->whereIn('barangay_id', $barangayIds);
        }

        $stats = [
            'total' => (clone $baseQuery)->count(),
            'active' => (clone $baseQuery)->where('is_active', true)->where('is_deceased', false)->count(),
            'inactive' => (clone $baseQuery)->where('is_active', false)->count(),
            'deceased' => (clone $baseQuery)->where('is_deceased', true)->count(),
            'male' => (clone $baseQuery)->where('gender_id', 1)->count(),
            'female' => (clone $baseQuery)->where('gender_id', 2)->count(),
        ];

        // Age brackets
        $stats['age_60_69'] = (clone $baseQuery)
            ->whereRaw('TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) BETWEEN 60 AND 69')
            ->count();
        $stats['age_70_79'] = (clone $baseQuery)
            ->whereRaw('TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) BETWEEN 70 AND 79')
            ->count();
        $stats['age_80_plus'] = (clone $baseQuery)
            ->whereRaw('TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) >= 80')
            ->count();

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }

    /**
     * Export seniors to Excel with letterhead.
     */
    public function export(Request $request)
    {
        $user = $request->user();
        
        $query = SeniorCitizen::with(['barangay', 'gender'])
            ->accessibleBy($user);

        // Apply same filters as index
        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('osca_id', 'like', "%{$search}%")
                    ->orWhere('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('middle_name', 'like', "%{$search}%");
            });
        }

        if ($barangayParam = $request->get('barangay_id')) {
            $barangayIds = is_array($barangayParam) ? $barangayParam : explode(',', $barangayParam);
            $barangayIds = array_values(array_filter(array_map('trim', $barangayIds)));
            if (!empty($barangayIds)) {
                $query->whereIn('barangay_id', $barangayIds);
            }
        }

        if ($districtParam = $request->get('district')) {
            $districts = is_array($districtParam) ? $districtParam : explode(',', $districtParam);
            $districts = array_values(array_filter(array_map('trim', $districts)));
            if (!empty($districts)) {
                $query->whereHas('barangay', function ($q) use ($districts) {
                    $q->whereIn('district', $districts);
                });
            }
        }

        if ($statusParam = $request->get('status')) {
            $statuses = is_array($statusParam) ? $statusParam : explode(',', $statusParam);
            $statuses = array_values(array_filter(array_map('trim', $statuses)));
            if (!empty($statuses) && !in_array('all', $statuses, true)) {
                $query->where(function ($statusQuery) use ($statuses) {
                    if (in_array('active', $statuses, true)) {
                        $statusQuery->orWhere(function ($q) {
                            $q->where('is_active', true)->where('is_deceased', false);
                        });
                    }
                    if (in_array('inactive', $statuses, true)) {
                        $statusQuery->orWhere(function ($q) {
                            $q->where('is_active', false)->where('is_deceased', false);
                        });
                    }
                    if (in_array('deceased', $statuses, true)) {
                        $statusQuery->orWhere('is_deceased', true);
                    }
                });
            }
        }

        if ($genderParam = $request->get('gender_id')) {
            $genderIds = is_array($genderParam) ? $genderParam : explode(',', $genderParam);
            $genderIds = array_values(array_filter(array_map('trim', $genderIds)));
            if (!empty($genderIds)) {
                $query->whereIn('gender_id', $genderIds);
            }
        }

        if ($ageCategories = $request->get('age_categories')) {
            $categories = is_array($ageCategories) ? $ageCategories : explode(',', $ageCategories);
            $query->where(function ($q) use ($categories) {
                foreach ($categories as $category) {
                    $category = trim($category);
                    match ($category) {
                        'sexagenarians' => $q->orWhereRaw('TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) BETWEEN 60 AND 69'),
                        'septuagenarians' => $q->orWhereRaw('TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) BETWEEN 70 AND 79'),
                        'octogenarians' => $q->orWhereRaw('TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) BETWEEN 80 AND 89'),
                        'nonagenarians' => $q->orWhereRaw('TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) BETWEEN 90 AND 99'),
                        'centenarians' => $q->orWhereRaw('TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) >= 100'),
                        default => null,
                    };
                }
            });
        }

        // Age range filter
        if ($minAge = $request->get('min_age')) {
            $maxDate = now()->subYears($minAge)->format('Y-m-d');
            $query->where('birthdate', '<=', $maxDate);
        }
        if ($maxAge = $request->get('max_age')) {
            $minDate = now()->subYears($maxAge + 1)->format('Y-m-d');
            $query->where('birthdate', '>', $minDate);
        }

        $seniors = $query->get();

        $headers = [
            'OSCA ID', 'Last Name', 'First Name', 'Middle Name', 'M.I.',
            'Birthdate', 'Age', 'Gender', 'Barangay', 'Status',
        ];

        $data = $seniors->map(fn($s) => [
            $s->osca_id,
            $s->last_name,
            $s->first_name,
            $s->middle_name ?? '',
            $s->middle_name ? strtoupper(substr($s->middle_name, 0, 1)) . '.' : '',
            $s->birthdate?->format('m/d/Y'),
            $s->age,
            $s->gender->name ?? '',
            $s->barangay->name ?? '',
            $s->is_active ? 'Active' : 'Inactive',
        ])->toArray();

        $excelService = new \App\Services\ExcelExportService();
        $excelService->create(
            'List of Registered Senior Citizens',
            $headers,
            $data,
            $user->full_name ?? $user->username ?? 'Admin'
        );

        return $excelService->download('seniors_export_' . date('Y-m-d') . '.xlsx');
    }

    /**
     * Update senior citizen information.
     * Logs changes for audit purposes.
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();
        
        // Find senior with access check
        $senior = SeniorCitizen::accessibleBy($user)->findOrFail($id);
        $wasDeceasedBefore = (bool) $senior->is_deceased;
        
        // Validate request
        $validated = $request->validate([
            'first_name' => 'sometimes|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'sometimes|string|max:100',
            'extension' => 'nullable|string|max:20',
            'birthdate' => 'sometimes|date',
            'gender_id' => 'sometimes|exists:genders,id',
            'civil_status_id' => 'nullable|exists:civil_statuses,id',
            'barangay_id' => 'sometimes|exists:barangays,id',
            'birthplace' => 'nullable|string|max:255',
            'house_number' => 'nullable|string|max:50',
            'street' => 'nullable|string|max:100',
            'purok' => 'nullable|string|max:100',
            'educational_attainment_id' => 'nullable|exists:educational_attainment,id',
            'socioeconomic_status_id' => 'nullable|exists:socioeconomic_statuses,id',
            'is_active' => 'sometimes|boolean',
            'is_deceased' => 'sometimes|boolean',
            'notes' => 'nullable|string',
            // Contact fields
            'mobile_number' => 'nullable|string|max:50',
            'telephone_number' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:100',
            // Association fields
            'target_sectors' => 'nullable|array',
            'target_sectors.*' => 'string',
            'sub_categories' => 'nullable|array',
            'sub_categories.*' => 'string',
        ]);

        // If changing barangay, verify user has access to new barangay
        if (isset($validated['barangay_id']) && $validated['barangay_id'] !== $senior->barangay_id) {
            $accessibleBarangays = $user->getAccessibleBarangayIds();
            if (!$user->isMainAdmin() && !in_array($validated['barangay_id'], $accessibleBarangays)) {
                return response()->json([
                    'success' => false,
                    'message' => 'You do not have access to the selected barangay.',
                ], 403);
            }
        }

        // Keep status flags consistent: deceased seniors cannot be active.
        if (array_key_exists('is_deceased', $validated)) {
            if ($validated['is_deceased']) {
                $validated['is_active'] = false;
                if (!$senior->deceased_date) {
                    $validated['deceased_date'] = now()->toDateString();
                }
            } else {
                $validated['deceased_date'] = null;
            }
        }

        try {
            DB::beginTransaction();

            // Track changes for audit log
            $changes = [];
            $oldValues = [];
            $newValues = [];

            foreach ($validated as $field => $value) {
                // Skip contact fields - handled separately
                if (in_array($field, ['mobile_number', 'telephone_number', 'email'])) {
                    continue;
                }
                
                $oldValue = $senior->$field;
                if ($oldValue != $value) {
                    $changes[] = $field;
                    $oldValues[$field] = $oldValue;
                    $newValues[$field] = $value;
                }
            }

            // Update senior record
            $senior->fill(array_diff_key($validated, array_flip(['mobile_number', 'telephone_number', 'email'])));
            $senior->save();

            // Archive once when the senior is newly marked as deceased.
            if (!$wasDeceasedBefore && (bool) $senior->is_deceased) {
                $alreadyArchived = Archive::query()
                    ->where('archive_type', 'senior_citizen')
                    ->where('reference_id', $senior->id)
                    ->where('archive_reason', 'deceased')
                    ->exists();

                if (!$alreadyArchived) {
                    Archive::create([
                        'archive_type' => 'senior_citizen',
                        'reference_id' => $senior->id,
                        'archive_data' => [
                            'id' => $senior->id,
                            'osca_id' => $senior->osca_id,
                            'first_name' => $senior->first_name,
                            'middle_name' => $senior->middle_name,
                            'last_name' => $senior->last_name,
                            'extension' => $senior->extension,
                            'birthdate' => optional($senior->birthdate)->format('Y-m-d'),
                            'gender_id' => $senior->gender_id,
                            'barangay_id' => $senior->barangay_id,
                            'branch_id' => $senior->branch_id,
                            'registration_date' => optional($senior->registration_date)->format('Y-m-d'),
                        ],
                        'archive_reason' => 'deceased',
                        'archive_notes' => $validated['notes'] ?? 'Automatically archived after being marked deceased.',
                        'original_created_at' => $senior->created_at,
                        'original_updated_at' => $senior->updated_at,
                        'deceased_date' => $senior->deceased_date,
                        'archived_by' => $user->id,
                        'archived_at' => now(),
                    ]);
                }
            }

            // Update contact info if provided
            if (isset($validated['mobile_number']) || isset($validated['telephone_number']) || isset($validated['email'])) {
                $contact = $senior->contact;
                if (!$contact) {
                    $contact = $senior->contact()->create([
                        'mobile_number' => $validated['mobile_number'] ?? null,
                        'telephone_number' => $validated['telephone_number'] ?? null,
                        'email' => $validated['email'] ?? null,
                    ]);
                } else {
                    if (isset($validated['mobile_number'])) $contact->mobile_number = $validated['mobile_number'];
                    if (isset($validated['telephone_number'])) $contact->telephone_number = $validated['telephone_number'];
                    if (isset($validated['email'])) $contact->email = $validated['email'];
                    $contact->save();
                }
            }

            // Log audit entry
            if (!empty($changes)) {
                $seniorName = "{$senior->first_name} {$senior->last_name}";

                // Determine specific action based on what changed
                if (in_array('is_deceased', $changes) && $senior->is_deceased) {
                    $action = 'senior_mark_deceased';
                    $desc = "Marked as deceased: {$seniorName}";
                } elseif (in_array('is_active', $changes) && !$senior->is_active) {
                    $action = 'senior_deactivated';
                    $desc = "Deactivated senior: {$seniorName}";
                } elseif (in_array('is_active', $changes) && $senior->is_active) {
                    $action = 'senior_activated';
                    $desc = "Activated senior: {$seniorName}";
                } elseif (in_array('barangay_id', $changes)) {
                    $action = 'senior_transfer';
                    $desc = "Transferred senior: {$seniorName} — barangay changed";
                } elseif (array_intersect(['first_name', 'middle_name', 'last_name', 'extension'], $changes)) {
                    $action = 'senior_name_change';
                    $desc = "Name updated: {$seniorName} — changed: " . implode(', ', $changes);
                } elseif (array_intersect(['birthdate', 'gender_id', 'civil_status_id', 'birthplace'], $changes)) {
                    $action = 'senior_personal_info';
                    $desc = "Personal info updated: {$seniorName} — changed: " . implode(', ', $changes);
                } elseif (array_intersect(['house_number', 'street', 'purok'], $changes)) {
                    $action = 'senior_address_update';
                    $desc = "Address updated: {$seniorName} — changed: " . implode(', ', $changes);
                } else {
                    $action = 'senior_update';
                    $desc = "Updated senior: {$seniorName} — changed: " . implode(', ', $changes);
                }

                $this->logAudit(
                    $action, 'senior_citizens', $senior->id,
                    $desc,
                    $oldValues, $newValues,
                    $seniorName
                );
            }

            DB::commit();

            // Reload with relationships
            $senior->load(['barangay', 'gender', 'civilStatus', 'contact', 'branch']);

            return response()->json([
                'success' => true,
                'message' => 'Senior citizen information updated successfully.',
                'data' => $senior,
                'changes' => $changes,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to update senior citizen: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Report a senior citizen as deceased with full details.
     */
    public function reportDeceased(Request $request, $id)
    {
        $user = $request->user();
        $senior = SeniorCitizen::accessibleBy($user)->findOrFail($id);

        if ($senior->is_deceased) {
            return response()->json([
                'success' => false,
                'message' => 'This senior citizen is already marked as deceased.',
            ], 422);
        }

        $validated = $request->validate([
            // Step 0: Death Details
            'date_of_death' => 'required|date|before_or_equal:today',
            'time_of_death' => 'nullable|string|max:10',
            'death_country' => 'nullable|string|max:100',
            'death_province' => 'nullable|string|max:100',
            'death_city' => 'nullable|string|max:100',
            'death_barangay' => 'nullable|string|max:100',
            'death_location_type' => 'nullable|string|in:hospital,residence,nursing_home,public_place,other',
            'death_location_type_other' => 'nullable|string|max:255',
            'cause_of_death' => 'nullable|string|max:1000',

            // Step 1: Certificate & Documents
            'certificate_number' => 'nullable|string|max:100',
            'registry_number' => 'nullable|string|max:100',
            'date_registered' => 'nullable|date',
            'registered_at' => 'nullable|string|in:lcro,psa',
            'certificate_issued_by' => 'nullable|string|max:255',
            'certificate_issue_date' => 'nullable|date',
            'death_certificate' => 'required|file|mimes:jpg,jpeg,png,pdf,doc,docx|max:5120',
            'supporting_document' => 'nullable|file|mimes:jpg,jpeg,png,pdf,doc,docx|max:5120',
            'supporting_doc_type' => 'nullable|string|in:burial_permit,hospital_cert,barangay_cert,funeral_doc,other',

            // Step 2: Informant & Burial
            'reporter_full_name' => 'required|string|max:255',
            'relationship_to_deceased' => 'required|string|max:100',
            'relationship_other' => 'nullable|string|max:100',
            'reporter_contact_number' => 'required|string|max:50',
            'reporter_address' => 'nullable|string|max:500',
            'burial_date' => 'nullable|date',
            'burial_location' => 'nullable|string|max:255',
            'cemetery_name' => 'nullable|string|max:255',
            'funeral_service_provider' => 'nullable|string|max:255',
        ]);

        try {
            DB::beginTransaction();

            // Handle file uploads
            $certificatePath = null;
            if ($request->hasFile('death_certificate')) {
                $certificatePath = $request->file('death_certificate')
                    ->store('deceased/certificates', 'public');
            }

            $supportingDocPath = null;
            if ($request->hasFile('supporting_document')) {
                $supportingDocPath = $request->file('supporting_document')
                    ->store('deceased/supporting', 'public');
            }

            // Create deceased report
            $report = DeceasedReport::create([
                'senior_id' => $senior->id,
                // Death details
                'date_of_death' => $validated['date_of_death'],
                'time_of_death' => $validated['time_of_death'] ?? null,
                'place_of_death' => $validated['death_location_type'] ?? 'other',
                'facility_name' => $validated['death_location_type_other'] ?? null,
                'cause_of_death' => $validated['cause_of_death'] ?? null,
                // Structured death location
                'death_country' => $validated['death_country'] ?? 'Philippines',
                'death_province' => $validated['death_province'] ?? null,
                'death_city' => $validated['death_city'] ?? null,
                'death_barangay' => $validated['death_barangay'] ?? null,
                'death_location_type' => $validated['death_location_type'] ?? null,
                'death_location_type_other' => $validated['death_location_type_other'] ?? null,
                // Reporter
                'reported_by' => $user->first_name . ' ' . $user->last_name,
                'relationship_to_deceased' => $validated['relationship_to_deceased'],
                'relationship_other' => $validated['relationship_other'] ?? null,
                'reporter_full_name' => $validated['reporter_full_name'],
                'reporter_contact_number' => $validated['reporter_contact_number'],
                'reporter_address' => $validated['reporter_address'] ?? null,
                // Certificate info
                'death_certificate_path' => $certificatePath,
                'certificate_number' => $validated['certificate_number'] ?? null,
                'registry_number' => $validated['registry_number'] ?? null,
                'date_registered' => $validated['date_registered'] ?? null,
                'registered_at' => $validated['registered_at'] ?? null,
                'certificate_issued_by' => $validated['certificate_issued_by'] ?? null,
                'certificate_issue_date' => $validated['certificate_issue_date'] ?? null,
                // Supporting docs
                'supporting_doc_path' => $supportingDocPath,
                'supporting_doc_type' => $validated['supporting_doc_type'] ?? null,
                // Burial
                'burial_date' => $validated['burial_date'] ?? null,
                'burial_location' => $validated['burial_location'] ?? null,
                'cemetery_name' => $validated['cemetery_name'] ?? null,
                'funeral_service_provider' => $validated['funeral_service_provider'] ?? null,
                // Account closure
                'id_card_status' => 'not_applicable',
                'benefits_terminated' => true,
                'submitted_by' => $user->id,
                'status' => 'submitted',
            ]);

            // Update senior status
            $senior->update([
                'is_deceased' => true,
                'is_active' => false,
                'deceased_date' => $validated['date_of_death'],
            ]);

            // Create archive record
            $alreadyArchived = Archive::query()
                ->where('archive_type', 'senior_citizen')
                ->where('reference_id', $senior->id)
                ->where('archive_reason', 'deceased')
                ->exists();

            if (!$alreadyArchived) {
                Archive::create([
                    'archive_type' => 'senior_citizen',
                    'reference_id' => $senior->id,
                    'archive_data' => [
                        'id' => $senior->id,
                        'osca_id' => $senior->osca_id,
                        'first_name' => $senior->first_name,
                        'middle_name' => $senior->middle_name,
                        'last_name' => $senior->last_name,
                        'extension' => $senior->extension,
                        'birthdate' => optional($senior->birthdate)->format('Y-m-d'),
                        'gender_id' => $senior->gender_id,
                        'barangay_id' => $senior->barangay_id,
                        'branch_id' => $senior->branch_id,
                        'registration_date' => optional($senior->registration_date)->format('Y-m-d'),
                        'date_of_death' => $validated['date_of_death'],
                        'cause_of_death' => $validated['cause_of_death'] ?? null,
                        'death_location_type' => $validated['death_location_type'] ?? null,
                    ],
                    'archive_reason' => 'deceased',
                    'archive_notes' => 'Reported deceased by ' . $validated['reporter_full_name'] . ' (' . $validated['relationship_to_deceased'] . ')',
                    'original_created_at' => $senior->created_at,
                    'original_updated_at' => $senior->updated_at,
                    'deceased_date' => $validated['date_of_death'],
                    'archived_by' => $user->id,
                    'archived_at' => now(),
                ]);
            }

            // Audit log — detailed
            $this->logAudit(
                'senior_mark_deceased',
                'senior_citizen',
                $senior->id,
                "Reported {$senior->first_name} {$senior->last_name} as deceased. " .
                "Date of death: {$validated['date_of_death']}. " .
                "Reported by: {$validated['reporter_full_name']} ({$validated['relationship_to_deceased']}). " .
                "Certificate #: " . ($validated['certificate_number'] ?? 'N/A'),
                ['is_deceased' => false, 'is_active' => $senior->getOriginal('is_active')],
                [
                    'is_deceased' => true,
                    'is_active' => false,
                    'deceased_date' => $validated['date_of_death'],
                    'cause_of_death' => $validated['cause_of_death'] ?? null,
                    'death_location_type' => $validated['death_location_type'] ?? null,
                    'reporter' => $validated['reporter_full_name'],
                    'relationship' => $validated['relationship_to_deceased'],
                    'certificate_number' => $validated['certificate_number'] ?? null,
                    'benefits_terminated' => true,
                ],
                $user->id
            );

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Senior citizen has been reported as deceased and archived.',
                'data' => $report,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Report deceased failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to process deceased report: ' . $e->getMessage(),
            ], 500);
        }
    }
}
