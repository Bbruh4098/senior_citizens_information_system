<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('benefit_claims', function (Blueprint $table) {
            if (!Schema::hasColumn('benefit_claims', 'claimed_by')) {
                $table->unsignedBigInteger('claimed_by')->nullable()->after('processed_by');
            }
            if (!Schema::hasColumn('benefit_claims', 'approved_by')) {
                $table->unsignedBigInteger('approved_by')->nullable()->after('claimed_by');
            }
            if (!Schema::hasColumn('benefit_claims', 'released_by')) {
                $table->unsignedBigInteger('released_by')->nullable()->after('approved_by');
            }
            if (!Schema::hasColumn('benefit_claims', 'rejected_by')) {
                $table->unsignedBigInteger('rejected_by')->nullable()->after('released_by');
            }
        });
    }

    public function down(): void
    {
        Schema::table('benefit_claims', function (Blueprint $table) {
            $columns = ['claimed_by', 'approved_by', 'released_by', 'rejected_by'];
            foreach ($columns as $col) {
                if (Schema::hasColumn('benefit_claims', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
