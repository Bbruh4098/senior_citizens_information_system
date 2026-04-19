<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SeniorCitizen;
use App\Models\Application;
use App\Models\Announcement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * Get dashboard statistics.
     */
    public function stats(Request $request)
    {
        $user = $request->user();
        $barangayIds = $user->getAccessibleBarangayIds();

        // Base query for seniors based on user access
        $seniorsQuery = SeniorCitizen::query();
        if (!$user->isMainAdmin()) {
            $seniorsQuery->whereIn('barangay_id', $barangayIds);
        }

        // Total Registered Senior Citizens
        $totalSeniors = (clone $seniorsQuery)->count();

        // Registered Active Senior Citizens
        $activeSeniors = (clone $seniorsQuery)
            ->where('is_active', true)
            ->where('is_deceased', false)
            ->count();

        // Deceased Senior Citizens
        $deceasedSeniors = (clone $seniorsQuery)
            ->where('is_deceased', true)
            ->count();

        // Pending Applications - combine applications for_verification + pre-registrations pending
        // This gives a meaningful "work to be done" count
        $pendingMainApps = Application::query()
            ->whereIn('status', ['pending', 'submitted', 'for_verification'])
            ->when(!$user->isMainAdmin(), function ($q) use ($barangayIds) {
                $q->whereHas('senior', function ($sq) use ($barangayIds) {
                    $sq->whereIn('barangay_id', $barangayIds);
                });
            })
            ->count();

        // Pre-registrations that are pending (online applications awaiting processing)
        $pendingPreRegs = \App\Models\PreRegistration::query()
            ->whereNotIn('status', ['approved', 'rejected'])
            ->when(!$user->isMainAdmin(), function ($q) use ($barangayIds) {
                $q->whereIn('barangay_id', $barangayIds);
            })
            ->count();

        $pendingApplications = $pendingMainApps + $pendingPreRegs;


        // ID Claimable (printed but not released)
        $idClaimable = DB::table('id_printing_queue')
            ->where('status', 'printed')
            ->when(!$user->isMainAdmin(), function ($q) use ($barangayIds) {
                $q->whereIn('senior_id', function ($sq) use ($barangayIds) {
                    $sq->select('id')
                        ->from('senior_citizens')
                        ->whereIn('barangay_id', $barangayIds);
                });
            })
            ->count();

        // Released IDs (this month)
        $releasedIds = DB::table('id_printing_queue')
            ->where('status', 'claimed')
            ->whereMonth('claimed_date', now()->month)
            ->whereYear('claimed_date', now()->year)
            ->when(!$user->isMainAdmin(), function ($q) use ($barangayIds) {
                $q->whereIn('senior_id', function ($sq) use ($barangayIds) {
                    $sq->select('id')
                        ->from('senior_citizens')
                        ->whereIn('barangay_id', $barangayIds);
                });
            })
            ->count();

        return response()->json([
            'success' => true,
            'data' => [
                'stats' => [
                    'total_seniors' => $totalSeniors,
                    'active_seniors' => $activeSeniors,
                    'deceased_seniors' => $deceasedSeniors,
                    'pending_applications' => $pendingApplications,
                    'id_claimable' => $idClaimable,
                    'released_ids' => $releasedIds,
                ],
            ],
        ]);
    }

    /**
     * Get upcoming events.
     */
    public function upcomingEvents(Request $request)
    {
        $user = $request->user();

        $events = Announcement::with(['type'])
            ->where('is_published', true)
            ->where('event_date', '>=', now())
            ->when(!$user->isMainAdmin(), function ($q) use ($user) {
                // Show announcements for user's accessible barangays or general announcements
                $q->where(function ($sq) use ($user) {
                    $sq->whereNull('barangay_id')
                        ->orWhereIn('barangay_id', $user->getAccessibleBarangayIds());
                });
            })
            ->orderBy('event_date')
            ->limit(5)
            ->get()
            ->map(function ($event) {
                return [
                    'id' => $event->id,
                    'title' => $event->title,
                    'type' => $event->type->name ?? 'General',
                    'event_date' => $event->event_date?->format('Y-m-d'),
                    'location' => $event->location,
                    'target_audience' => $event->target_audience,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => [
                'events' => $events,
            ],
        ]);
    }

    /**
     * Get age distribution for charts.
     */
    public function ageDistribution(Request $request)
    {
        $user = $request->user();
        $barangayIds = $user->getAccessibleBarangayIds();

        $distribution = DB::table('senior_citizens')
            ->select(DB::raw('
                CASE 
                    WHEN TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) BETWEEN 60 AND 69 THEN "60-69"
                    WHEN TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) BETWEEN 70 AND 79 THEN "70-79"
                    WHEN TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) BETWEEN 80 AND 89 THEN "80-89"
                    WHEN TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) BETWEEN 90 AND 99 THEN "90-99"
                    WHEN TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) >= 100 THEN "100+"
                    ELSE "Unknown"
                END as age_group,
                COUNT(*) as count
            '))
            ->where('is_active', true)
            ->where('is_deceased', false)
            ->when(!$user->isMainAdmin(), function ($q) use ($barangayIds) {
                $q->whereIn('barangay_id', $barangayIds);
            })
            ->groupBy('age_group')
            ->orderBy('age_group')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'distribution' => $distribution,
            ],
        ]);
    }

    /**
     * Get gender distribution.
     */
    public function genderDistribution(Request $request)
    {
        $user = $request->user();
        $barangayIds = $user->getAccessibleBarangayIds();

        $distribution = DB::table('senior_citizens')
            ->join('genders', 'senior_citizens.gender_id', '=', 'genders.id')
            ->select('genders.name as gender', DB::raw('COUNT(*) as count'))
            ->where('senior_citizens.is_active', true)
            ->where('senior_citizens.is_deceased', false)
            ->when(!$user->isMainAdmin(), function ($q) use ($barangayIds) {
                $q->whereIn('senior_citizens.barangay_id', $barangayIds);
            })
            ->groupBy('genders.name')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'distribution' => $distribution,
            ],
        ]);
    }

    /**
     * Get heatmap data - per-barangay demographic breakdowns.
     */
    public function heatmapData(Request $request)
    {
        $user = $request->user();
        $barangayIds = $user->getAccessibleBarangayIds();

        // Get all barangay info
        $barangays = DB::table('barangays')
            ->select('id', 'code', 'name', 'district')
            ->when(!$user->isMainAdmin(), function ($q) use ($barangayIds) {
                $q->whereIn('id', $barangayIds);
            })
            ->get()
            ->keyBy('id');

        // Filter params (single or multi via CSV/array)
        $statusRaw = $request->get('status', 'active');
        $genderRaw = $request->get('gender_id');
        $ageRaw = $request->get('age_category');
        $districtRaw = $request->get('district');
        $barangayRaw = $request->get('barangay_ids');
        $minAge = $request->filled('min_age') ? (int) $request->get('min_age') : null;
        $maxAge = $request->filled('max_age') ? (int) $request->get('max_age') : null;

        $statuses = is_array($statusRaw) ? $statusRaw : explode(',', (string) $statusRaw);
        $statuses = array_values(array_filter(array_map('trim', $statuses)));
        if (empty($statuses)) {
            $statuses = ['active'];
        }

        $genderIds = is_array($genderRaw) ? $genderRaw : ($genderRaw ? explode(',', (string) $genderRaw) : []);
        $genderIds = array_values(array_filter(array_map('trim', $genderIds)));

        $ageCategories = is_array($ageRaw) ? $ageRaw : ($ageRaw ? explode(',', (string) $ageRaw) : []);
        $ageCategories = array_values(array_filter(array_map('trim', $ageCategories)));

        $districts = is_array($districtRaw) ? $districtRaw : ($districtRaw ? explode(',', (string) $districtRaw) : []);
        $districts = array_values(array_filter(array_map('trim', $districts)));

        $selectedBarangayIds = is_array($barangayRaw) ? $barangayRaw : ($barangayRaw ? explode(',', (string) $barangayRaw) : []);
        $selectedBarangayIds = array_values(array_filter(array_map('trim', $selectedBarangayIds)));

        // Base conditions: status + access scope + location filters
        $applyBase = function ($q) use ($user, $barangayIds, $statuses, $districts, $selectedBarangayIds) {
            // Status supports multi-select (active, deceased, all)
            if (!in_array('all', $statuses, true)) {
                $q->where(function ($statusQuery) use ($statuses) {
                    if (in_array('active', $statuses, true)) {
                        $statusQuery->orWhere(function ($sq) {
                            $sq->where('is_active', true)->where('is_deceased', false);
                        });
                    }
                    if (in_array('deceased', $statuses, true)) {
                        $statusQuery->orWhere('is_deceased', true);
                    }
                });
            }

            $q->when(!$user->isMainAdmin(), function ($sq) use ($barangayIds) {
                $sq->whereIn('barangay_id', $barangayIds);
            });

            if (!empty($districts)) {
                $q->whereIn('barangay_id', function ($sq) use ($districts) {
                    $sq->select('id')
                        ->from('barangays')
                        ->whereIn('district', $districts);
                });
            }

            if (!empty($selectedBarangayIds)) {
                $q->whereIn('barangay_id', $selectedBarangayIds);
            }
        };

        // Age category SQL clause
        $applyAge = function ($q) use ($ageCategories) {
            if (!empty($ageCategories)) {
                $q->where(function ($ageQuery) use ($ageCategories) {
                    foreach ($ageCategories as $ageCategory) {
                        switch ($ageCategory) {
                            case 'age_60_69':
                                $ageQuery->orWhereRaw('TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) BETWEEN 60 AND 69');
                                break;
                            case 'age_70_79':
                                $ageQuery->orWhereRaw('TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) BETWEEN 70 AND 79');
                                break;
                            case 'age_80_89':
                                $ageQuery->orWhereRaw('TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) BETWEEN 80 AND 89');
                                break;
                            case 'age_90_99':
                                $ageQuery->orWhereRaw('TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) BETWEEN 90 AND 99');
                                break;
                            case 'centenarian':
                                $ageQuery->orWhereRaw('TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) >= 100');
                                break;
                        }
                    }
                });
            }
        };

        // Numeric age range filter (can be combined with age category filter)
        $applyAgeRange = function ($q) use ($minAge, $maxAge) {
            if ($minAge !== null) {
                $q->whereRaw('TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) >= ?', [$minAge]);
            }
            if ($maxAge !== null) {
                $q->whereRaw('TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) <= ?', [$maxAge]);
            }
        };

        // Filtered count per barangay (combo: gender + age)
        $filteredCounts = DB::table('senior_citizens')
            ->select('barangay_id', DB::raw('COUNT(*) as count'))
            ->where($applyBase)
            ->where($applyAge)
            ->where($applyAgeRange)
            ->when(!empty($genderIds), fn($q) => $q->whereIn('gender_id', $genderIds))
            ->groupBy('barangay_id')
            ->pluck('count', 'barangay_id');

        // Total per barangay (base only, for popup)
        $totals = DB::table('senior_citizens')
            ->select('barangay_id', DB::raw('COUNT(*) as total'))
            ->where($applyBase)
            ->groupBy('barangay_id')
            ->pluck('total', 'barangay_id');

        // Dynamic gender counts for popup breakdown
        $allGenders = DB::table('genders')
            ->where('is_enabled', true)
            ->orderBy('sort_order')
            ->get();

        $genderCounts = [];
        foreach ($allGenders as $gender) {
            $genderCounts[$gender->id] = DB::table('senior_citizens')
                ->select('barangay_id', DB::raw('COUNT(*) as count'))
                ->where($applyBase)
                ->where('gender_id', $gender->id)
                ->groupBy('barangay_id')
                ->pluck('count', 'barangay_id');
        }

        // Age groups for popup breakdown
        $ageGroups = DB::table('senior_citizens')
            ->select(
                'barangay_id',
                DB::raw('SUM(CASE WHEN TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) BETWEEN 60 AND 69 THEN 1 ELSE 0 END) as age_60_69'),
                DB::raw('SUM(CASE WHEN TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) BETWEEN 70 AND 79 THEN 1 ELSE 0 END) as age_70_79'),
                DB::raw('SUM(CASE WHEN TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) BETWEEN 80 AND 89 THEN 1 ELSE 0 END) as age_80_89'),
                DB::raw('SUM(CASE WHEN TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) BETWEEN 90 AND 99 THEN 1 ELSE 0 END) as age_90_99'),
                DB::raw('SUM(CASE WHEN TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) >= 100 THEN 1 ELSE 0 END) as centenarian')
            )
            ->where($applyBase)
            ->groupBy('barangay_id')
            ->get()
            ->keyBy('barangay_id');

        // Build distribution
        $distribution = [];
        foreach ($barangays as $id => $brgy) {
            $ages = $ageGroups->get($id);
            $entry = [
                'barangay_id' => $id,
                'name' => $brgy->name,
                'district' => $brgy->district,
                'total' => (int) ($totals->get($id, 0)),
                'count' => (int) ($filteredCounts->get($id, 0)),
                'age_60_69' => (int) ($ages->age_60_69 ?? 0),
                'age_70_79' => (int) ($ages->age_70_79 ?? 0),
                'age_80_89' => (int) ($ages->age_80_89 ?? 0),
                'age_90_99' => (int) ($ages->age_90_99 ?? 0),
                'centenarian' => (int) ($ages->centenarian ?? 0),
            ];
            foreach ($allGenders as $gender) {
                $entry['gender_' . $gender->id] = (int) ($genderCounts[$gender->id]->get($id, 0));
            }
            $distribution[] = $entry;
        }

        // Gender metadata
        $gendersMeta = $allGenders->map(fn($g) => [
            'id' => $g->id, 'name' => $g->name, 'key' => 'gender_' . $g->id,
        ])->values();

        // Summary
        $summaryTotals = [
            'total' => array_sum(array_column($distribution, 'total')),
            'filtered' => array_sum(array_column($distribution, 'count')),
            'max_count' => max(array_column($distribution, 'count') ?: [0]),
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'distribution' => $distribution,
                'totals' => $summaryTotals,
                'genders' => $gendersMeta,
            ],
        ]);
    }
}
