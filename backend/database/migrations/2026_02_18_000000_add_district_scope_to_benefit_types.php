<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Change the enum to include 'district' option
        DB::statement("ALTER TABLE benefit_types MODIFY COLUMN target_scope ENUM('all', 'branch', 'barangays', 'district') DEFAULT 'all'");

        // Add district_id column for district-scoped benefits
        if (!Schema::hasColumn('benefit_types', 'district_id')) {
            Schema::table('benefit_types', function (Blueprint $table) {
                $table->unsignedBigInteger('district_id')->nullable()->after('branch_id');
            });
        }
    }

    public function down(): void
    {
        // Revert district-scoped benefits back to 'all'
        DB::table('benefit_types')->where('target_scope', 'district')->update(['target_scope' => 'all', 'district_id' => null]);

        DB::statement("ALTER TABLE benefit_types MODIFY COLUMN target_scope ENUM('all', 'branch', 'barangays') DEFAULT 'all'");

        Schema::table('benefit_types', function (Blueprint $table) {
            $table->dropColumn('district_id');
        });
    }
};
