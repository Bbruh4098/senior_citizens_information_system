<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('civil_statuses')) {
            Schema::create('civil_statuses', function (Blueprint $table) {
                $table->id();
                $table->string('name', 50);
            });
        }

        if (DB::table('civil_statuses')->count() === 0) {
            DB::table('civil_statuses')->insert([
                ['id' => 1, 'name' => 'Single'],
                ['id' => 2, 'name' => 'Married'],
                ['id' => 3, 'name' => 'Separated'],
                ['id' => 4, 'name' => 'Widow'],
                ['id' => 5, 'name' => 'Widower'],
                ['id' => 6, 'name' => 'Divorced'],
                ['id' => 7, 'name' => 'Annulled'],
                ['id' => 8, 'name' => 'Single Parent'],
            ]);
        }

        if (
            Schema::hasTable('senior_citizens') &&
            !Schema::hasColumn('senior_citizens', 'civil_status_id')
        ) {
            Schema::table('senior_citizens', function (Blueprint $table) {
                $table->unsignedBigInteger('civil_status_id')->nullable()->after('gender_id');
                $table->foreign('civil_status_id')
                      ->references('id')
                      ->on('civil_statuses')
                      ->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (
            Schema::hasTable('senior_citizens') &&
            Schema::hasColumn('senior_citizens', 'civil_status_id')
        ) {
            Schema::table('senior_citizens', function (Blueprint $table) {
                $table->dropForeign(['civil_status_id']);
                $table->dropColumn('civil_status_id');
            });
        }

        Schema::dropIfExists('civil_statuses');
    }
};
