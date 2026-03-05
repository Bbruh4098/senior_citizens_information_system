<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Traits\LogsAudit;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DropdownController extends Controller
{
    use LogsAudit;

    // Allowed dropdown types → [table, label_column, extra_columns, display_name]
    private const TYPES = [
        'genders' => [
            'table' => 'genders',
            'label' => 'name',
            'columns' => ['name', 'code'],
            'display' => 'Genders',
        ],
        'civil_statuses' => [
            'table' => 'civil_statuses',
            'label' => 'name',
            'columns' => ['name'],
            'display' => 'Civil Statuses',
        ],
        'educational_attainment' => [
            'table' => 'educational_attainment',
            'label' => 'level',
            'columns' => ['level'],
            'display' => 'Educational Attainment',
        ],
        'announcement_types' => [
            'table' => 'announcement_types',
            'label' => 'name',
            'columns' => ['name', 'code', 'description'],
            'display' => 'Announcement Types',
        ],
        'application_types' => [
            'table' => 'application_types',
            'label' => 'name',
            'columns' => ['name', 'code', 'description', 'processing_days'],
            'display' => 'Application Types',
        ],
        'mobility_levels' => [
            'table' => 'mobility_levels',
            'label' => 'level',
            'columns' => ['level', 'description'],
            'display' => 'Mobility Levels',
        ],
    ];

    // List all items for a dropdown type
    public function index(Request $request, string $type): JsonResponse
    {
        $config = $this->resolveType($type);
        if (!$config) {
            return response()->json(['error' => 'Invalid dropdown type'], 404);
        }

        $items = DB::table($config['table'])
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $items,
            'meta' => [
                'type' => $type,
                'display' => $config['display'],
                'columns' => $config['columns'],
                'label_column' => $config['label'],
            ],
        ]);
    }

    // Create a new dropdown item
    public function store(Request $request, string $type): JsonResponse
    {
        $config = $this->resolveType($type);
        if (!$config) {
            return response()->json(['error' => 'Invalid dropdown type'], 404);
        }

        $rules = $this->validationRules($config, $type);
        $validated = $request->validate($rules);

        // Add defaults
        $validated['is_enabled'] = $request->boolean('is_enabled', true);
        $validated['sort_order'] = $request->input('sort_order', 0);

        // Add timestamps if table has them
        if (Schema::hasColumn($config['table'], 'created_at')) {
            $validated['created_at'] = now();
            $validated['updated_at'] = now();
        }

        $id = DB::table($config['table'])->insertGetId($validated);

        $labelValue = $validated[$config['label']] ?? "#{$id}";
        $this->logAudit(
            'dropdown_create', $config['table'], $id,
            "Created {$config['display']} option: {$labelValue}",
            null, $validated, $labelValue
        );

        $item = DB::table($config['table'])->find($id);

        return response()->json([
            'success' => true,
            'message' => "{$config['display']} option created",
            'data' => $item,
        ], 201);
    }

    // Update a dropdown item
    public function update(Request $request, string $type, int $id): JsonResponse
    {
        $config = $this->resolveType($type);
        if (!$config) {
            return response()->json(['error' => 'Invalid dropdown type'], 404);
        }

        $existing = DB::table($config['table'])->find($id);
        if (!$existing) {
            return response()->json(['error' => 'Item not found'], 404);
        }

        $rules = $this->validationRules($config, $type, $id);
        $validated = $request->validate($rules);

        if ($request->has('is_enabled')) {
            $validated['is_enabled'] = $request->boolean('is_enabled');
        }
        if ($request->has('sort_order')) {
            $validated['sort_order'] = (int) $request->input('sort_order');
        }

        if (Schema::hasColumn($config['table'], 'updated_at')) {
            $validated['updated_at'] = now();
        }

        DB::table($config['table'])->where('id', $id)->update($validated);

        $labelValue = $validated[$config['label']] ?? $existing->{$config['label']} ?? "#{$id}";
        $this->logAudit(
            'dropdown_update', $config['table'], $id,
            "Updated {$config['display']} option: {$labelValue}",
            null, $validated, $labelValue
        );

        $item = DB::table($config['table'])->find($id);

        return response()->json([
            'success' => true,
            'message' => "{$config['display']} option updated",
            'data' => $item,
        ]);
    }

    // Toggle is_enabled for a dropdown item
    public function toggleEnabled(Request $request, string $type, int $id): JsonResponse
    {
        $config = $this->resolveType($type);
        if (!$config) {
            return response()->json(['error' => 'Invalid dropdown type'], 404);
        }

        $existing = DB::table($config['table'])->find($id);
        if (!$existing) {
            return response()->json(['error' => 'Item not found'], 404);
        }

        $newStatus = !$existing->is_enabled;
        DB::table($config['table'])->where('id', $id)->update(['is_enabled' => $newStatus]);

        $labelValue = $existing->{$config['label']} ?? "#{$id}";
        $statusWord = $newStatus ? 'enabled' : 'disabled';
        $this->logAudit(
            "dropdown_{$statusWord}", $config['table'], $id,
            "{$config['display']} option {$statusWord}: {$labelValue}",
            ['is_enabled' => !$newStatus],
            ['is_enabled' => $newStatus],
            $labelValue
        );

        return response()->json([
            'success' => true,
            'message' => "Option {$statusWord}",
            'data' => ['is_enabled' => $newStatus],
        ]);
    }

    // Reorder items
    public function reorder(Request $request, string $type): JsonResponse
    {
        $config = $this->resolveType($type);
        if (!$config) {
            return response()->json(['error' => 'Invalid dropdown type'], 404);
        }

        $request->validate([
            'order' => 'required|array',
            'order.*.id' => 'required|integer',
            'order.*.sort_order' => 'required|integer|min:0',
        ]);

        foreach ($request->order as $item) {
            DB::table($config['table'])
                ->where('id', $item['id'])
                ->update(['sort_order' => $item['sort_order']]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Order updated',
        ]);
    }

    // Get list of available dropdown types
    public function types(): JsonResponse
    {
        $types = collect(self::TYPES)->map(fn($c, $key) => [
            'key' => $key,
            'display' => $c['display'],
            'columns' => $c['columns'],
            'label_column' => $c['label'],
        ])->values();

        return response()->json([
            'success' => true,
            'data' => $types,
        ]);
    }

    // Helpers 
    private function resolveType(string $type): ?array
    {
        return self::TYPES[$type] ?? null;
    }

    private function validationRules(array $config, string $type, ?int $excludeId = null): array
    {
        $rules = [];
        $table = $config['table'];

        foreach ($config['columns'] as $col) {
            $unique = $excludeId
                ? "unique:{$table},{$col},{$excludeId}"
                : "unique:{$table},{$col}";

            if ($col === $config['label']) {
                $rules[$col] = "required|string|max:255|{$unique}";
            } elseif ($col === 'code') {
                $rules[$col] = "nullable|string|max:20|{$unique}";
            } elseif ($col === 'description') {
                $rules[$col] = 'nullable|string|max:500';
            } elseif ($col === 'processing_days') {
                $rules[$col] = 'nullable|integer|min:1';
            } else {
                $rules[$col] = 'nullable|string|max:255';
            }
        }

        return $rules;
    }
}
