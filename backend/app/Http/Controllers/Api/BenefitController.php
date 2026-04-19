<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BenefitClaim;
use App\Models\BenefitType;
use App\Models\Gender;
use App\Models\SeniorCitizen;
use App\Traits\LogsAudit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class BenefitController extends Controller
{
    use LogsAudit;

    private function applyClaimFilters($query, Request $request)
    {
        $currentYear = now()->year;

        // Filter by status 
        if ($status = $request->get('status')) {
            $statuses = is_array($status) ? $status : explode(',', $status);
            $statuses = array_filter(array_map('trim', $statuses));
            if (count($statuses) === 1) {
                $query->status($statuses[0]);
            } elseif (count($statuses) > 1) {
                $query->whereIn('status', $statuses);
            }
        }

        // Filter by benefit type 
        if ($typeId = $request->get('benefit_type_id')) {
            $typeIds = is_array($typeId) ? $typeId : explode(',', $typeId);
            $typeIds = array_filter(array_map('trim', $typeIds));
            if (count($typeIds) === 1) {
                $query->where('benefit_type_id', $typeIds[0]);
            } elseif (count($typeIds) > 1) {
                $query->whereIn('benefit_type_id', $typeIds);
            }
        }

        // Filter by date range
        $dateFrom = $request->get('date_from');
        $dateTo = $request->get('date_to');
        if ($dateFrom && $dateTo) {
            $query->whereBetween('created_at', [
                Carbon::parse($dateFrom)->startOfDay(),
                Carbon::parse($dateTo)->endOfDay(),
            ]);
        } elseif ($dateFrom) {
            $query->where('created_at', '>=', Carbon::parse($dateFrom)->startOfDay());
        } elseif ($dateTo) {
            $query->where('created_at', '<=', Carbon::parse($dateTo)->endOfDay());
        } elseif ($year = $request->get('year')) {
            $query->forYear($year);
        } else {
            $query->forYear($currentYear);
        }

        // Filter by barangay IDs
        if ($barangayIds = $request->get('barangay_ids')) {
            $ids = is_array($barangayIds) ? $barangayIds : explode(',', $barangayIds);
            $ids = array_filter(array_map('trim', $ids));
            if (!empty($ids)) {
                $query->whereHas('senior', function ($q) use ($ids) {
                    $q->whereIn('barangay_id', $ids);
                });
            }
        }

        // Filter by district 
        if ($district = $request->get('district')) {
            $districts = is_array($district) ? $district : explode(',', $district);
            $districts = array_filter(array_map('trim', $districts));
            if (!empty($districts)) {
                $query->whereHas('senior.barangay', function ($q) use ($districts) {
                    $q->whereIn('district', $districts);
                });
            }
        }

        // Filter by gender IDs
        if ($genderId = $request->get('gender_id')) {
            $genderIds = is_array($genderId) ? $genderId : explode(',', $genderId);
            $genderIds = array_filter(array_map('trim', $genderIds));
            if (!empty($genderIds)) {
                $query->whereHas('senior', function ($q) use ($genderIds) {
                    $q->whereIn('gender_id', $genderIds);
                });
            }
        }

        // Search by senior name or OSCA ID
        if ($search = $request->get('search')) {
            $query->whereHas('senior', function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('osca_id', 'like', "%{$search}%");
            });
        }

        return $query;
    }

    // Get all benefit types.
    public function types()
    {
        $types = BenefitType::active()
            ->orderBy('min_age')
            ->get()
            ->map(function ($type) {
                return [
                    'id' => $type->id,
                    'name' => $type->name,
                    'description' => $type->description,
                    'min_age' => $type->min_age,
                    'max_age' => $type->max_age,
                    'age_range' => $type->age_range,
                    'amount' => $type->amount,
                    'formatted_amount' => $type->formatted_amount,
                    'is_one_time' => $type->is_one_time,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $types,
        ]);
    }

    // Get paginated list of benefit claims.
    public function index(Request $request)
    {
        $user = $request->user();
        $perPage = $request->get('per_page', 10);

        $query = BenefitClaim::with(['senior', 'senior.barangay', 'benefitType', 'processor', 'claimer', 'approver', 'releaser', 'rejecter'])
            ->accessibleBy($user);

        $this->applyClaimFilters($query, $request);

        $query->orderBy('created_at', 'desc');
        $claims = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $claims->items(),
            'meta' => [
                'total' => $claims->total(),
                'per_page' => $claims->perPage(),
                'current_page' => $claims->currentPage(),
                'last_page' => $claims->lastPage(),
            ],
        ]);
    }

    // Export benefit claims as CSV.
    public function exportClaims(Request $request)
    {
        $user = $request->user();

        $query = BenefitClaim::with(['senior', 'senior.barangay', 'benefitType', 'processor'])
            ->accessibleBy($user);

        $this->applyClaimFilters($query, $request);

        $claims = $query->orderBy('created_at', 'desc')->get();

        $headers = [
            'OSCA ID', 'Senior Name', 'Barangay', 'District', 'Benefit Type',
            'Amount', 'Year', 'Status', 'Date Filed', 'Released At',
        ];

        $data = $claims->map(fn($c) => [
            $c->senior?->osca_id ?? '',
            $c->senior?->full_name ?? ($c->senior?->first_name . ' ' . $c->senior?->last_name),
            $c->senior?->barangay?->name ?? '',
            $c->senior?->barangay?->district ?? '',
            $c->benefitType?->name ?? '',
            number_format($c->amount, 2),
            $c->claim_year,
            ucfirst($c->status),
            $c->created_at->format('m/d/Y'),
            $c->released_at?->format('m/d/Y') ?? '',
        ])->toArray();

        $label = $request->get('date_from') && $request->get('date_to')
            ? $request->get('date_from') . '_to_' . $request->get('date_to')
            : ($request->get('year') ?? now()->year);
        $excelService = new \App\Services\ExcelExportService();
        $excelService->create(
            "Benefit Claims Report - {$label}",
            $headers,
            $data,
            $user->full_name ?? $user->username ?? 'Admin'
        );

        return $excelService->download('benefit_claims_' . $label . '_' . now()->format('Ymd_His') . '.xlsx');
    }

    // Get seniors eligible for benefits they haven't claimed yet.
    public function eligible(Request $request)
    {
        $user = $request->user();
        $perPage = $request->get('per_page', 10);
        $currentYear = now()->year;

        // Get benefit types (optionally filtered)
        $benefitTypesQuery = BenefitType::active()->where('amount', '>', 0)->orderBy('min_age');
        
        // Filter by specific benefit type(s)
        if ($filterTypeId = $request->get('benefit_type_id')) {
            $typeIds = is_array($filterTypeId) ? $filterTypeId : explode(',', $filterTypeId);
            $typeIds = array_filter(array_map('trim', $typeIds));
            if (!empty($typeIds)) {
                $benefitTypesQuery->whereIn('id', $typeIds);
            }
        }

        // Filter by benefit amount range
        if ($minAmount = $request->get('min_amount')) {
            $benefitTypesQuery->where('amount', '>=', $minAmount);
        }
        if ($maxAmount = $request->get('max_amount')) {
            $benefitTypesQuery->where('amount', '<=', $maxAmount);
        }
        
        $benefitTypes = $benefitTypesQuery->get();

        // Search term
        $search = $request->get('search');

        // Age range params
        $filterMinAge = $request->get('min_age');
        $filterMaxAge = $request->get('max_age');

        // Barangay filter
        $barangayIds = $request->get('barangay_ids');
        if ($barangayIds) {
            $barangayIds = is_array($barangayIds) ? $barangayIds : explode(',', $barangayIds);
            $barangayIds = array_filter(array_map('trim', $barangayIds));
        }

        // Gender filter
        $genderIds = $request->get('gender_id');
        if ($genderIds) {
            $genderIds = is_array($genderIds) ? $genderIds : explode(',', $genderIds);
            $genderIds = array_filter(array_map('trim', $genderIds));
        }

        // Build query for seniors who are eligible but haven't claimed
        $eligibleSeniors = [];

        foreach ($benefitTypes as $benefitType) {
            // Query seniors who have reached the minimum age for this benefit
            $query = SeniorCitizen::where('is_active', true)
                ->when($user->role_id !== 1 && $user->branch_id, function ($q) use ($user) {
                    $q->accessibleBy($user);
                });

            // Apply search filter
            if ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('osca_id', 'like', "%{$search}%");
                });
            }

            // Apply barangay filter
            if (!empty($barangayIds)) {
                $query->whereIn('barangay_id', $barangayIds);
            }

            // Apply gender filter
            if (!empty($genderIds)) {
                $query->whereIn('gender_id', $genderIds);
            }

            // Cumulative eligibility: age >= min_age (birthdate <= maxBirthdate for that min_age)
            $maxBirthdate = now()->subYears($benefitType->min_age)->endOfYear();
            $query->where('birthdate', '<=', $maxBirthdate);

            // Apply age range filter (narrows further)
            if ($filterMinAge) {
                // min_age means birthdate <= (now - min_age years)
                $ageBirthdate = now()->subYears($filterMinAge)->endOfYear();
                $query->where('birthdate', '<=', $ageBirthdate);
            }
            if ($filterMaxAge) {
                // max_age means birthdate >= (now - max_age years)
                $ageBirthdate = now()->subYears($filterMaxAge + 1)->startOfYear();
                $query->where('birthdate', '>=', $ageBirthdate);
            }

            // Exclude seniors who already claimed this benefit (one-time benefits)
            if ($benefitType->is_one_time) {
                $query->whereDoesntHave('benefitClaims', function ($q) use ($benefitType) {
                    $q->where('benefit_type_id', $benefitType->id)
                        ->whereIn('status', ['approved', 'released', 'pending']);
                });
            } else {
                // For yearly benefits, check current year only
                $query->whereDoesntHave('benefitClaims', function ($q) use ($benefitType, $currentYear) {
                    $q->where('benefit_type_id', $benefitType->id)
                        ->where('claim_year', $currentYear)
                        ->whereIn('status', ['approved', 'released', 'pending']);
                });
            }

            $seniors = $query->with('barangay')
                ->select('senior_citizens.*')
                ->selectRaw('TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) as age')
                ->get();

            foreach ($seniors as $senior) {
                // Check target scope eligibility (district, branch, barangays)
                if ($senior->barangay_id && !$benefitType->isEligibleForBarangay($senior->barangay_id)) {
                    continue;
                }

                // Check association eligibility (target sectors / sub-categories)
                if (!$benefitType->isEligibleForAssociation($senior)) {
                    continue;
                }

                $eligibleSeniors[] = [
                    'senior_id' => $senior->id,
                    'osca_id' => $senior->osca_id,
                    'full_name' => $senior->full_name ?? "{$senior->first_name} {$senior->last_name}",
                    'age' => $senior->age,
                    'gender_id' => $senior->gender_id,
                    'barangay' => $senior->barangay?->name,
                    'barangay_id' => $senior->barangay_id,
                    'benefit_type_id' => $benefitType->id,
                    'benefit_name' => $benefitType->name,
                    'benefit_amount' => $benefitType->amount,
                    'formatted_amount' => $benefitType->formatted_amount,
                ];
            }
        }

        // Paginate manually
        $total = count($eligibleSeniors);
        $page = $request->get('page', 1);
        $offset = ($page - 1) * $perPage;
        $pagedData = array_slice($eligibleSeniors, $offset, $perPage);

        return response()->json([
            'success' => true,
            'data' => $pagedData,
            'meta' => [
                'total' => $total,
                'per_page' => $perPage,
                'current_page' => (int) $page,
                'last_page' => ceil($total / $perPage) ?: 1,
            ],
        ]);
    }

    // Export eligible seniors as CSV.
    public function exportEligible(Request $request)
    {
        $user = $request->user();
        $currentYear = now()->year;

        $benefitTypesQuery = BenefitType::active()->where('amount', '>', 0)->orderBy('min_age');
        
        // Filter by specific benefit type(s)
        if ($filterTypeId = $request->get('benefit_type_id')) {
            $typeIds = is_array($filterTypeId) ? $filterTypeId : explode(',', $filterTypeId);
            $typeIds = array_filter(array_map('trim', $typeIds));
            if (!empty($typeIds)) {
                $benefitTypesQuery->whereIn('id', $typeIds);
            }
        }

        // Filter by benefit amount range
        if ($minAmount = $request->get('min_amount')) {
            $benefitTypesQuery->where('amount', '>=', $minAmount);
        }
        if ($maxAmount = $request->get('max_amount')) {
            $benefitTypesQuery->where('amount', '<=', $maxAmount);
        }
        
        $benefitTypes = $benefitTypesQuery->get();
        $search = $request->get('search');

        // Age range params
        $filterMinAge = $request->get('min_age');
        $filterMaxAge = $request->get('max_age');

        // Barangay filter
        $barangayIds = $request->get('barangay_ids');
        if ($barangayIds) {
            $barangayIds = is_array($barangayIds) ? $barangayIds : explode(',', $barangayIds);
            $barangayIds = array_filter(array_map('trim', $barangayIds));
        }

        // Gender filter
        $genderIds = $request->get('gender_id');
        if ($genderIds) {
            $genderIds = is_array($genderIds) ? $genderIds : explode(',', $genderIds);
            $genderIds = array_filter(array_map('trim', $genderIds));
        }

        $eligibleSeniors = [];

        foreach ($benefitTypes as $benefitType) {
            $query = SeniorCitizen::where('is_active', true)
                ->when($user->role_id !== 1 && $user->branch_id, function ($q) use ($user) {
                    $q->accessibleBy($user);
                });

            if ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('osca_id', 'like', "%{$search}%");
                });
            }

            // Apply barangay filter
            if (!empty($barangayIds)) {
                $query->whereIn('barangay_id', $barangayIds);
            }

            // Apply gender filter
            if (!empty($genderIds)) {
                $query->whereIn('gender_id', $genderIds);
            }

            $maxBirthdate = now()->subYears($benefitType->min_age)->endOfYear();
            $query->where('birthdate', '<=', $maxBirthdate);

            // Apply age range filter
            if ($filterMinAge) {
                $ageBirthdate = now()->subYears($filterMinAge)->endOfYear();
                $query->where('birthdate', '<=', $ageBirthdate);
            }
            if ($filterMaxAge) {
                $ageBirthdate = now()->subYears($filterMaxAge + 1)->startOfYear();
                $query->where('birthdate', '>=', $ageBirthdate);
            }

            if ($benefitType->is_one_time) {
                $query->whereDoesntHave('benefitClaims', function ($q) use ($benefitType) {
                    $q->where('benefit_type_id', $benefitType->id)
                        ->whereIn('status', ['approved', 'released', 'pending']);
                });
            } else {
                $query->whereDoesntHave('benefitClaims', function ($q) use ($benefitType, $currentYear) {
                    $q->where('benefit_type_id', $benefitType->id)
                        ->where('claim_year', $currentYear)
                        ->whereIn('status', ['approved', 'released', 'pending']);
                });
            }

            $seniors = $query->with('barangay')
                ->select('senior_citizens.*')
                ->selectRaw('TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) as age')
                ->get();

            foreach ($seniors as $senior) {
                if ($senior->barangay_id && !$benefitType->isEligibleForBarangay($senior->barangay_id)) {
                    continue;
                }

                if (!$benefitType->isEligibleForAssociation($senior)) {
                    continue;
                }

                $eligibleSeniors[] = [
                    $senior->osca_id,
                    $senior->full_name ?? "{$senior->first_name} {$senior->last_name}",
                    $senior->age,
                    $senior->barangay?->name ?? '',
                    $benefitType->name,
                    number_format($benefitType->amount, 2),
                ];
            }
        }

        $headers = [
            'OSCA ID', 'Senior Name', 'Age', 'Barangay', 'Eligible Benefit', 'Amount',
        ];

        $excelService = new \App\Services\ExcelExportService();
        $excelService->create(
            'Eligible Seniors Report',
            $headers,
            $eligibleSeniors,
            $user->full_name ?? $user->username ?? 'Admin'
        );

        return $excelService->download('eligible_seniors_' . now()->format('Ymd_His') . '.xlsx');
    }

    // Get dashboard statistics for benefits.
    public function statistics(Request $request)
    {
        $user = $request->user();
        $currentYear = now()->year;

        // Build a base query that respects all active filters
        $baseQuery = BenefitClaim::accessibleBy($user);
        $this->applyClaimFilters($baseQuery, $request);

        // Clone for each stat so filters are preserved but status overrides work
        $stats = [
            'total_claims' => (clone $baseQuery)->count(),
            'pending' => (clone $baseQuery)->where('status', 'pending')->count(),
            'approved' => (clone $baseQuery)->where('status', 'approved')->count(),
            'released' => (clone $baseQuery)->where('status', 'released')->count(),
            'rejected' => (clone $baseQuery)->where('status', 'rejected')->count(),
            'total_released_amount' => (clone $baseQuery)->where('status', 'released')->sum('amount'),
        ];

        // Eligible unclaimed count — only compute when no claim-level filters are active
        // (eligible count is a senior-level metric, not a claims metric)
        $hasClaimFilters = $request->filled('status') || $request->filled('benefit_type_id');
        if (!$hasClaimFilters) {
            $benefitTypes = BenefitType::active()->where('amount', '>', 0)->get();
            $eligibleCount = 0;

            foreach ($benefitTypes as $benefitType) {
                $query = SeniorCitizen::where('is_active', true)
                    ->when($user->role_id !== 1 && $user->branch_id, function ($q) use ($user) {
                        $q->accessibleBy($user);
                    });

                // Apply barangay filter to eligible count too
                if ($barangayIds = $request->get('barangay_ids')) {
                    $ids = is_array($barangayIds) ? $barangayIds : explode(',', $barangayIds);
                    $ids = array_filter(array_map('trim', $ids));
                    if (!empty($ids)) {
                        $query->whereIn('barangay_id', $ids);
                    }
                }

                // Apply district filter to eligible count
                if ($district = $request->get('district')) {
                    $districts = is_array($district) ? $district : explode(',', $district);
                    $districts = array_filter(array_map('trim', $districts));
                    if (!empty($districts)) {
                        $query->whereHas('barangay', function ($q) use ($districts) {
                            $q->whereIn('district', $districts);
                        });
                    }
                }

                // Apply gender filter to eligible count
                if ($genderId = $request->get('gender_id')) {
                    $genderIds = is_array($genderId) ? $genderId : explode(',', $genderId);
                    $genderIds = array_filter(array_map('trim', $genderIds));
                    if (!empty($genderIds)) {
                        $query->whereIn('gender_id', $genderIds);
                    }
                }

                $minBirthdate = now()->subYears($benefitType->max_age ?? 150)->startOfYear();
                $maxBirthdate = now()->subYears($benefitType->min_age)->endOfYear();

                $query->whereBetween('birthdate', [$minBirthdate, $maxBirthdate]);

                if ($benefitType->is_one_time) {
                    $query->whereDoesntHave('benefitClaims', function ($q) use ($benefitType) {
                        $q->where('benefit_type_id', $benefitType->id)
                            ->whereIn('status', ['approved', 'released', 'pending']);
                    });
                }

                $eligibleCount += $query->count();
            }

            $stats['eligible_unclaimed'] = $eligibleCount;
        } else {
            $stats['eligible_unclaimed'] = null; // Not applicable when claim filters are active
        }

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }

    /**
     * Get filter options: distinct barangays, districts, and benefit types present in claims.
     */
    public function filterOptions(Request $request)
    {
        $user = $request->user();

        // Get barangays that have claims
        $barangays = DB::table('benefit_claims')
            ->join('senior_citizens', 'benefit_claims.senior_id', '=', 'senior_citizens.id')
            ->join('barangays', 'senior_citizens.barangay_id', '=', 'barangays.id')
            ->select('barangays.id', 'barangays.name', 'barangays.district')
            ->distinct()
            ->orderBy('barangays.name')
            ->get();

        // Get distinct districts
        $districts = $barangays->pluck('district')->filter()->unique()->sort()->values();

        // Get enabled genders for dynamic filter options
        $genders = Gender::where('is_enabled', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get(['id', 'name']);

        return response()->json([
            'success' => true,
            'data' => [
                'barangays' => $barangays,
                'districts' => $districts,
                'genders' => $genders,
            ],
        ]);
    }

    /**
     * Get benefit distribution by type for dashboard charts.
     */
    public function typeDistribution(Request $request)
    {
        $user = $request->user();
        $year = (int) ($request->get('year', now()->year));

        $baseQuery = BenefitClaim::accessibleBy($user)->forYear($year);

        $distribution = $baseQuery
            ->join('benefit_types', 'benefit_claims.benefit_type_id', '=', 'benefit_types.id')
            ->select(
                'benefit_claims.benefit_type_id',
                'benefit_types.name',
                DB::raw('COUNT(*) as total_claims'),
                DB::raw("SUM(CASE WHEN benefit_claims.status = '" . BenefitClaim::STATUS_RELEASED . "' THEN 1 ELSE 0 END) as released_claims"),
                DB::raw("SUM(CASE WHEN benefit_claims.status = '" . BenefitClaim::STATUS_RELEASED . "' THEN benefit_claims.amount ELSE 0 END) as total_released_amount")
            )
            ->groupBy('benefit_claims.benefit_type_id', 'benefit_types.name')
            ->orderByDesc('total_claims')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'year' => $year,
                'distribution' => $distribution,
            ],
        ]);
    }

    // Create a new benefit claim.
    public function store(Request $request)
    {
        $request->validate([
            'senior_id' => 'required|exists:senior_citizens,id',
            'benefit_type_id' => 'required|exists:benefit_types,id',
            'notes' => 'nullable|string|max:500',
        ]);

        $user = $request->user();
        $currentYear = now()->year;

        $senior = SeniorCitizen::findOrFail($request->senior_id);
        $benefitType = BenefitType::findOrFail($request->benefit_type_id);

        // Verify senior is eligible for this benefit
        $age = $senior->birthdate->age;
        if (!$benefitType->isEligibleForAge($age)) {
            return response()->json([
                'success' => false,
                'message' => "Senior is {$age} years old and not eligible for {$benefitType->name} benefit (ages {$benefitType->age_range}).",
            ], 422);
        }

        // Check if already claimed (for one-time benefits)
        if ($benefitType->is_one_time) {
            $existingClaim = BenefitClaim::where('senior_id', $senior->id)
                ->where('benefit_type_id', $benefitType->id)
                ->whereIn('status', ['pending', 'approved', 'released'])
                ->first();

            if ($existingClaim) {
                return response()->json([
                    'success' => false,
                    'message' => "Senior has already claimed {$benefitType->name} benefit (Status: {$existingClaim->status}).",
                ], 422);
            }
        } else {
            // Check current year for recurring benefits
            $existingClaim = BenefitClaim::where('senior_id', $senior->id)
                ->where('benefit_type_id', $benefitType->id)
                ->where('claim_year', $currentYear)
                ->whereIn('status', ['pending', 'approved', 'released'])
                ->first();

            if ($existingClaim) {
                return response()->json([
                    'success' => false,
                    'message' => "Senior has already claimed {$benefitType->name} benefit for {$currentYear}.",
                ], 422);
            }
        }

        $claim = BenefitClaim::create([
            'senior_id' => $senior->id,
            'benefit_type_id' => $benefitType->id,
            'claim_year' => $currentYear,
            'amount' => $benefitType->amount,
            'status' => 'pending',
            'claimed_by' => $user->id,
            'notes' => $request->notes,
        ]);

        $claim->load(['senior', 'benefitType']);

        $seniorName = "{$senior->first_name} {$senior->last_name}";
        $this->logAudit(
            'benefit_claim', 'benefit_claims', $claim->id,
            "Benefit claimed: {$benefitType->name} for {$seniorName} (₱" . number_format($claim->amount, 2) . ")",
            null,
            ['benefit_type' => $benefitType->name, 'amount' => $claim->amount, 'senior_id' => $senior->id, 'claim_year' => $currentYear],
            $seniorName
        );

        return response()->json([
            'success' => true,
            'message' => 'Benefit claim created successfully.',
            'data' => $claim,
        ], 201);
    }

    /**
     * Update claim status.
     */
    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:approved,released,rejected',
            'notes' => 'nullable|string|max:500',
        ]);

        $user = $request->user();
        $claim = BenefitClaim::findOrFail($id);

        // Verify the claim's senior is within the user's accessible scope
        $senior = $claim->senior;
        if ($senior && !$user->isMainAdmin()) {
            $accessibleBarangayIds = $user->getAccessibleBarangayIds();
            if ($senior->barangay_id && !in_array($senior->barangay_id, $accessibleBarangayIds)) {
                return response()->json([
                    'success' => false,
                    'message' => 'You can only manage claims for seniors within your jurisdiction.',
                ], 403);
            }
        }

        $claim->status = $request->status;
        $claim->processed_by = $user->id;

        switch ($request->status) {
            case 'approved':
                $claim->approved_by = $user->id;
                break;
            case 'released':
                $claim->released_by = $user->id;
                $claim->released_at = now();
                break;
            case 'rejected':
                $claim->rejected_by = $user->id;
                break;
        }

        if ($request->notes) {
            $claim->notes = $request->notes;
        }

        $claim->save();
        $claim->load(['senior', 'benefitType', 'processor', 'claimer', 'approver', 'releaser', 'rejecter']);

        $seniorName = "{$claim->senior->first_name} {$claim->senior->last_name}";
        $statusLabel = ucfirst($request->status);
        $actionKey = 'claim_' . $request->status;
        $this->logAudit(
            $actionKey, 'benefit_claims', $claim->id,
            "Claim {$statusLabel}: {$claim->benefitType->name} for {$seniorName}",
            ['status' => 'pending'],
            ['status' => $request->status],
            $seniorName
        );

        return response()->json([
            'success' => true,
            'message' => 'Claim status updated to ' . $statusLabel,
            'data' => $claim,
        ]);
    }

    /**
     * Get claims and eligibility for a specific senior.
     */
    public function seniorClaims($seniorId)
    {
        $senior = SeniorCitizen::with(['benefitClaims.benefitType', 'benefitClaims.processor', 'benefitClaims.claimer', 'benefitClaims.approver', 'benefitClaims.rejecter', 'benefitClaims.releaser', 'barangay'])
            ->find($seniorId);

        if (!$senior) {
            return response()->json([
                'success' => false,
                'message' => 'Senior not found',
            ], 404);
        }

        $age = $senior->age;

        // Get all active benefit types
        $benefitTypes = BenefitType::active()
            ->where('amount', '>', 0)
            ->orderBy('min_age')
            ->get();

        // Build eligibility summary for each benefit type
        $eligibility = [];
        foreach ($benefitTypes as $type) {
            $isEligible = $type->isEligibleForAge($age);
        
        // check barangay/district scope eligibility
        if ($isEligible && $senior->barangay_id) {
            $isEligible = $type->isEligibleForBarangay($senior->barangay_id);
        }

        // Check association eligibility (target sectors / sub-categories)
        if ($isEligible) {
            $isEligible = $type->isEligibleForAssociation($senior);
        }
            
            // Check if already claimed
            $existingClaim = $senior->benefitClaims
                ->where('benefit_type_id', $type->id)
                ->whereIn('status', ['pending', 'approved', 'released'])
                ->first();

            $eligibility[] = [
                'benefit_type_id' => $type->id,
                'name' => $type->name,
                'min_age' => $type->min_age,
                'amount' => $type->amount,
                'formatted_amount' => $type->formatted_amount,
                'is_eligible' => $isEligible,
                'has_claimed' => $existingClaim !== null,
                'claim_status' => $existingClaim?->status,
                'claim_id' => $existingClaim?->id,
            ];
        }

        // Get detailed claim history
        $claims = $senior->benefitClaims->map(function ($claim) {
            return [
                'id' => $claim->id,
                'benefit_type_id' => $claim->benefit_type_id,
                'benefit_name' => $claim->benefitType->name,
                'amount' => $claim->amount,
                'claim_year' => $claim->claim_year,
                'status' => $claim->status,
                'released_at' => $claim->released_at?->format('Y-m-d'),
                'filed_by' => $claim->claimer ? $claim->claimer->first_name . ' ' . $claim->claimer->last_name : null,
                'processed_by' => $claim->approver ? $claim->approver->first_name . ' ' . $claim->approver->last_name : ($claim->rejecter ? $claim->rejecter->first_name . ' ' . $claim->rejecter->last_name : ($claim->processor ? $claim->processor->first_name . ' ' . $claim->processor->last_name : null)),
                'released_by' => $claim->releaser ? $claim->releaser->first_name . ' ' . $claim->releaser->last_name : null,
                'notes' => $claim->notes,
                'created_at' => $claim->created_at->format('Y-m-d'),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => [
                'senior' => [
                    'id' => $senior->id,
                    'osca_id' => $senior->osca_id,
                    'full_name' => $senior->full_name,
                    'age' => $age,
                    'barangay' => $senior->barangay?->name,
                ],
                'eligibility' => $eligibility,
                'claims' => $claims,
            ],
        ]);
    }

    // ==========================================
    // BENEFIT TYPE MANAGEMENT (Main Admin Only)
    // ==========================================

    /**
     * Get all benefit types including inactive (for settings page)
     */
    public function allTypes(Request $request)
    {
        $user = $request->user();
        
        // Allow Main Admin, FO Admin, and Barangay Admin
        if (!$user->isMainAdmin() && !$user->isFOAdmin() && !$user->isBarangayAdmin()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        try {
            // Check if new columns exist
            $hasNewColumns = \Schema::hasColumn('benefit_types', 'claim_interval_days');
            
            $query = BenefitType::query();
            
            // Only load new relationships if columns exist
            if ($hasNewColumns) {
                $query->with(['barangays', 'branch', 'district', 'creator']);
            }
            
            $query->orderBy('min_age');
            
            // FO Admins only see benefits targeting their jurisdiction
            // Only apply this if the new columns exist
            if (!$user->isMainAdmin() && $hasNewColumns && method_exists(BenefitType::class, 'scopeAccessibleBy')) {
                $query->accessibleBy($user);
            }
            
            $types = $query->get()
                ->map(function ($type) use ($hasNewColumns) {
                    $data = [
                        'id' => $type->id,
                        'name' => $type->name,
                        'description' => $type->description,
                        'min_age' => $type->min_age,
                        'max_age' => $type->max_age,
                        'age_range' => $type->age_range,
                        'amount' => $type->amount,
                        'formatted_amount' => $type->formatted_amount,
                        'is_one_time' => $type->is_one_time,
                        'is_active' => $type->is_active,
                        'created_at' => $type->created_at,
                    ];
                    
                    // Add new fields only if columns exist
                    if ($hasNewColumns) {
                        $data['claim_interval_days'] = $type->claim_interval_days ?? null;
                        $data['frequency_description'] = $type->frequency_description ?? null;
                        $data['target_scope'] = $type->target_scope ?? 'all';
                        $data['branch_id'] = $type->branch_id ?? null;
                        $data['branch'] = $type->branch ?? null;
                        $data['district_id'] = $type->district_id ?? null;
                        $data['district'] = $type->district ?? null;
                        $data['barangay_ids'] = $type->barangays ? $type->barangays->pluck('id') : [];
                        $data['barangays'] = $type->barangays ?? [];
                        $data['created_by'] = $type->created_by ?? null;
                        $data['creator'] = $type->creator ?? null;
                    }
                    
                    return $data;
                });

            return response()->json([
                'success' => true,
                'data' => $types,
            ]);
        } catch (\Exception $e) {
            // Log error for debugging
            \Log::error('Error loading benefit types: ' . $e->getMessage());
            
            // Fallback: return basic benefit types without new fields
            $types = BenefitType::orderBy('min_age')->get()
                ->map(function ($type) {
                    return [
                        'id' => $type->id,
                        'name' => $type->name,
                        'description' => $type->description,
                        'min_age' => $type->min_age,
                        'max_age' => $type->max_age,
                        'age_range' => $type->age_range,
                        'amount' => $type->amount,
                        'formatted_amount' => $type->formatted_amount,
                        'is_one_time' => $type->is_one_time,
                        'is_active' => $type->is_active,
                        'created_at' => $type->created_at,
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $types,
            ]);
        }
    }

    /**
     * Create a new benefit type
     */
    public function storeBenefitType(Request $request)
    {
        $user = $request->user();
        
        // Allow Main Admin, FO Admin, and Barangay Admin to create benefits
        if (!$user->isMainAdmin() && !$user->isFOAdmin() && !$user->isBarangayAdmin()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:benefit_types',
            'description' => 'nullable|string|max:500',
            'min_age' => 'required|integer|min:60|max:120',
            'max_age' => 'nullable|integer|min:60|max:150',
            'amount' => 'required|numeric|min:0',
            'is_one_time' => 'boolean',
            'claim_interval_days' => 'nullable|integer|min:1',
            'target_scope' => 'sometimes|in:all,branch,barangays,district',
            'branch_id' => 'nullable|exists:branches,id',
            'district_id' => 'nullable|exists:districts,id',
            'barangay_ids' => 'nullable|array',
            'barangay_ids.*' => 'exists:barangays,id',
            'required_sectors' => 'nullable|array',
            'required_sectors.*' => 'string',
            'required_sub_categories' => 'nullable|array',
            'required_sub_categories.*' => 'string',
            'association_mode' => 'sometimes|in:any,all',
        ]);

        // Validate max_age >= min_age if provided
        if (isset($validated['max_age']) && $validated['max_age'] < $validated['min_age']) {
            return response()->json([
                'error' => 'Maximum age must be greater than or equal to minimum age'
            ], 422);
        }

        // FO/Barangay Admins can only create benefits within their jurisdiction
        if (!$user->isMainAdmin()) {
            $accessibleBranchIds = $user->branch_id ? [$user->branch_id] : [];
            $accessibleBarangayIds = $user->getAccessibleBarangayIds();
            
            // Barangay admins: auto-scope to their barangay(s)
            if ($user->isBarangayAdmin()) {
                $validated['target_scope'] = 'barangays';
                // If no barangay_ids provided, default to their accessible barangays
                if (empty($validated['barangay_ids'])) {
                    $validated['barangay_ids'] = $accessibleBarangayIds;
                }
            }
            
            // FO admins: enforce branch targeting if no scope specified
            if ($user->isFOAdmin() && (empty($validated['target_scope']) || $validated['target_scope'] === 'all')) {
                $validated['target_scope'] = 'branch';
                $validated['branch_id'] = $accessibleBranchIds[0] ?? null;
            }
            
            // Validate branch_id is in their jurisdiction
            if ($validated['target_scope'] === 'branch' && isset($validated['branch_id'])) {
                if (!in_array($validated['branch_id'], $accessibleBranchIds)) {
                    return response()->json(['error' => 'You can only create benefits for your assigned field office'], 403);
                }
            }
            
            // Validate barangay_ids are in their jurisdiction
            if ($validated['target_scope'] === 'barangays' && !empty($validated['barangay_ids'])) {
                $invalidBarangays = array_diff($validated['barangay_ids'], $accessibleBarangayIds);
                if (!empty($invalidBarangays)) {
                    return response()->json(['error' => 'You can only target barangays within your jurisdiction'], 403);
                }
            }
        }

        // Extract barangay_ids before creating
        $barangayIds = $validated['barangay_ids'] ?? [];
        unset($validated['barangay_ids']);
        
        // Set creator
        $validated['created_by'] = $user->id;

        $type = BenefitType::create($validated);
        
        // Sync barangays if targeting specific barangays (for barangays, district, or branch scope)
        if (in_array($validated['target_scope'], ['barangays', 'district', 'branch'])) {
            $type->barangays()->sync($barangayIds);
        }

        $type->load('barangays', 'branch', 'district');

        return response()->json([
            'success' => true,
            'message' => 'Benefit type created successfully',
            'data' => $type,
        ], 201);
    }

    /**
     * Update a benefit type
     */
    public function updateBenefitType(Request $request, $id)
    {
        $user = $request->user();
        
        // Allow Main Admin, FO Admin, and Barangay Admin
        if (!$user->isMainAdmin() && !$user->isFOAdmin() && !$user->isBarangayAdmin()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $type = BenefitType::findOrFail($id);
        
        // FO Admins can only edit benefits they created or that target their jurisdiction
        if (!$user->isMainAdmin()) {
            $accessibleBranchIds = $user->branch_id ? [$user->branch_id] : [];
            if ($type->created_by !== $user->id && 
                !($type->target_scope === 'branch' && in_array($type->branch_id, $accessibleBranchIds))) {
                return response()->json(['error' => 'You can only edit benefits you created or that belong to your field office'], 403);
            }
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:100|unique:benefit_types,name,' . $id,
            'description' => 'nullable|string|max:500',
            'min_age' => 'sometimes|integer|min:60|max:120',
            'max_age' => 'nullable|integer|min:60|max:150',
            'amount' => 'sometimes|numeric|min:0',
            'is_one_time' => 'boolean',
            'claim_interval_days' => 'nullable|integer|min:1',
            'target_scope' => 'sometimes|in:all,branch,barangays,district',
            'branch_id' => 'nullable|exists:branches,id',
            'district_id' => 'nullable|exists:districts,id',
            'barangay_ids' => 'nullable|array',
            'barangay_ids.*' => 'exists:barangays,id',
            'required_sectors' => 'nullable|array',
            'required_sectors.*' => 'string',
            'required_sub_categories' => 'nullable|array',
            'required_sub_categories.*' => 'string',
            'association_mode' => 'sometimes|in:any,all',
        ]);

        // Validate max_age >= min_age if both are set
        $minAge = $validated['min_age'] ?? $type->min_age;
        $maxAge = $validated['max_age'] ?? $type->max_age;
        if ($maxAge !== null && $maxAge < $minAge) {
            return response()->json([
                'error' => 'Maximum age must be greater than or equal to minimum age'
            ], 422);
        }
        
        // FO Admin jurisdiction validation for target changes
        if (!$user->isMainAdmin()) {
            $accessibleBarangayIds = $user->getAccessibleBarangayIds();
            
            // Validate barangay_ids are in their jurisdiction
            if (!empty($validated['barangay_ids'])) {
                $invalidBarangays = array_diff($validated['barangay_ids'], $accessibleBarangayIds);
                if (!empty($invalidBarangays)) {
                    return response()->json(['error' => 'You can only target barangays within your jurisdiction'], 403);
                }
            }
        }
        
        // Extract barangay_ids before updating
        $barangayIds = $validated['barangay_ids'] ?? null;
        unset($validated['barangay_ids']);

        $type->update($validated);
        
        // Sync barangays if provided (for barangays, district, or branch scope)
        if ($barangayIds !== null) {
            $type->barangays()->sync($barangayIds);
        }

        $type->load('barangays', 'branch', 'district');

        return response()->json([
            'success' => true,
            'message' => 'Benefit type updated successfully',
            'data' => $type,
        ]);
    }

    /**
     * Toggle benefit type active status
     */
    public function toggleBenefitType(Request $request, $id)
    {
        $user = $request->user();
        
        if (!$user->isMainAdmin() && !$user->isFOAdmin() && !$user->isBarangayAdmin()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $type = BenefitType::findOrFail($id);

        // Non-main admins can only toggle benefits they created or in their jurisdiction
        if (!$user->isMainAdmin()) {
            $accessibleBranchIds = $user->branch_id ? [$user->branch_id] : [];
            $accessibleBarangayIds = $user->getAccessibleBarangayIds();
            $canManage = $type->created_by === $user->id
                || ($type->target_scope === 'branch' && in_array($type->branch_id, $accessibleBranchIds))
                || ($type->target_scope === 'barangays' && $type->barangays()->whereIn('barangays.id', $accessibleBarangayIds)->exists());
            if (!$canManage) {
                return response()->json(['error' => 'You can only manage benefits within your jurisdiction'], 403);
            }
        }

        $type->is_active = !$type->is_active;
        $type->save();

        return response()->json([
            'success' => true,
            'message' => $type->is_active ? 'Benefit type activated' : 'Benefit type deactivated',
            'data' => $type,
        ]);
    }

    /**
     * Delete a benefit type (only if no claims exist)
     */
    public function destroyBenefitType(Request $request, $id)
    {
        $user = $request->user();
        
        if (!$user->isMainAdmin() && !$user->isFOAdmin() && !$user->isBarangayAdmin()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $type = BenefitType::findOrFail($id);

        // Non-main admins can only delete benefits they created
        if (!$user->isMainAdmin() && $type->created_by !== $user->id) {
            return response()->json(['error' => 'You can only delete benefits you created'], 403);
        }



        // Check if there are any claims for this type
        $claimCount = BenefitClaim::where('benefit_type_id', $id)->count();
        if ($claimCount > 0) {
            return response()->json([
                'error' => 'Cannot delete benefit type with existing claims. Deactivate it instead.'
            ], 400);
        }

        $type->delete();

        return response()->json([
            'success' => true,
            'message' => 'Benefit type deleted successfully',
        ]);
    }
}

