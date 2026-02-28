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

        // Registered Active Senior Citizens
        $activeSeniors = (clone $seniorsQuery)
            ->where('is_active', true)
            ->where('is_deceased', false)
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
            ->whereNotIn('status', ['converted', 'rejected'])
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
                    'active_seniors' => $activeSeniors,
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

        // Base query conditions
        $baseConditions = function ($q) use ($user, $barangayIds) {
            $q->where('is_active', true)
              ->where('is_deceased', false)
              ->when(!$user->isMainAdmin(), function ($sq) use ($barangayIds) {
                  $sq->whereIn('barangay_id', $barangayIds);
              });
        };

        // Total count per barangay
        $totals = DB::table('senior_citizens')
            ->select('barangay_id', DB::raw('COUNT(*) as total'))
            ->where($baseConditions)
            ->groupBy('barangay_id')
            ->pluck('total', 'barangay_id');

        // Male count per barangay (gender_id = 1)
        $males = DB::table('senior_citizens')
            ->select('barangay_id', DB::raw('COUNT(*) as count'))
            ->where($baseConditions)
            ->where('gender_id', 1)
            ->groupBy('barangay_id')
            ->pluck('count', 'barangay_id');

        // Female count per barangay (gender_id = 2)
        $females = DB::table('senior_citizens')
            ->select('barangay_id', DB::raw('COUNT(*) as count'))
            ->where($baseConditions)
            ->where('gender_id', 2)
            ->groupBy('barangay_id')
            ->pluck('count', 'barangay_id');

        // Age groups per barangay
        $ageGroups = DB::table('senior_citizens')
            ->select(
                'barangay_id',
                DB::raw('SUM(CASE WHEN TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) BETWEEN 60 AND 69 THEN 1 ELSE 0 END) as age_60_69'),
                DB::raw('SUM(CASE WHEN TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) BETWEEN 70 AND 79 THEN 1 ELSE 0 END) as age_70_79'),
                DB::raw('SUM(CASE WHEN TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) BETWEEN 80 AND 89 THEN 1 ELSE 0 END) as age_80_89'),
                DB::raw('SUM(CASE WHEN TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) BETWEEN 90 AND 99 THEN 1 ELSE 0 END) as age_90_99'),
                DB::raw('SUM(CASE WHEN TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) >= 100 THEN 1 ELSE 0 END) as centenarian')
            )
            ->where($baseConditions)
            ->groupBy('barangay_id')
            ->get()
            ->keyBy('barangay_id');

        // Build distribution array
        $distribution = [];
        foreach ($barangays as $id => $brgy) {
            $ages = $ageGroups->get($id);
            $distribution[] = [
                'barangay_id' => $id,
                'name' => $brgy->name,
                'district' => $brgy->district,
                'total' => (int) ($totals->get($id, 0)),
                'male' => (int) ($males->get($id, 0)),
                'female' => (int) ($females->get($id, 0)),
                'age_60_69' => (int) ($ages->age_60_69 ?? 0),
                'age_70_79' => (int) ($ages->age_70_79 ?? 0),
                'age_80_89' => (int) ($ages->age_80_89 ?? 0),
                'age_90_99' => (int) ($ages->age_90_99 ?? 0),
                'centenarian' => (int) ($ages->centenarian ?? 0),
            ];
        }

        // Compute summary totals
        $summaryTotals = [
            'total' => array_sum(array_column($distribution, 'total')),
            'male' => array_sum(array_column($distribution, 'male')),
            'female' => array_sum(array_column($distribution, 'female')),
            'centenarian' => array_sum(array_column($distribution, 'centenarian')),
            'max_count' => max(array_column($distribution, 'total') ?: [0]),
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'distribution' => $distribution,
                'totals' => $summaryTotals,
            ],
        ]);
    }
}
