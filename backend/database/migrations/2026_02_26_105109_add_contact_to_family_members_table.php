<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('family_members', function (Blueprint $table) {
            if (!Schema::hasColumn('family_members', 'mobile_number')) {
                $table->string('mobile_number', 20)->nullable()->after('monthly_salary');
            }
            if (!Schema::hasColumn('family_members', 'telephone_number')) {
                $table->string('telephone_number', 20)->nullable()->after('mobile_number');
            }
        });
    }

    public function down(): void
    {
        Schema::table('family_members', function (Blueprint $table) {
            $table->dropColumn(['mobile_number', 'telephone_number']);
        });
    }
};
