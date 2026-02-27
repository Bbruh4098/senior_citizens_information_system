<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $tables = ['genders', 'civil_statuses', 'educational_attainment', 'announcement_types', 'application_types', 'mobility_levels'];

        foreach ($tables as $table) {
            if (Schema::hasTable($table)) {
                Schema::table($table, function (Blueprint $t) use ($table) {
                    if (!Schema::hasColumn($table, 'is_enabled')) {
                        $t->boolean('is_enabled')->default(true)->after('id');
                    }
                    if (!Schema::hasColumn($table, 'sort_order')) {
                        $t->unsignedInteger('sort_order')->default(0)->after('is_enabled');
                    }
                });
            }
        }
    }

    public function down(): void
    {
        $tables = ['genders', 'civil_statuses', 'educational_attainment', 'announcement_types', 'application_types', 'mobility_levels'];

        foreach ($tables as $table) {
            if (Schema::hasTable($table)) {
                Schema::table($table, function (Blueprint $t) use ($table) {
                    if (Schema::hasColumn($table, 'is_enabled')) {
                        $t->dropColumn('is_enabled');
                    }
                    if (Schema::hasColumn($table, 'sort_order')) {
                        $t->dropColumn('sort_order');
                    }
                });
            }
        }
    }
};
