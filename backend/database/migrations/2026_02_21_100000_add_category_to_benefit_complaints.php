<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('benefit_complaints', 'category')) {
            return;
        }

        Schema::table('benefit_complaints', function (Blueprint $table) {
            $table->string('category', 50)->default('benefit')->after('benefit_claim_id');
        });
    }

    public function down(): void
    {
        if (Schema::hasColumn('benefit_complaints', 'category')) {
            Schema::table('benefit_complaints', function (Blueprint $table) {
                $table->dropColumn('category');
            });
        }
    }
};
