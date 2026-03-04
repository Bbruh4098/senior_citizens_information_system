<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('benefit_types', function (Blueprint $table) {
            if (!Schema::hasColumn('benefit_types', 'required_sectors')) {
                $table->json('required_sectors')->nullable()->after('is_active');
            }
            if (!Schema::hasColumn('benefit_types', 'required_sub_categories')) {
                $table->json('required_sub_categories')->nullable()->after('required_sectors');
            }
            if (!Schema::hasColumn('benefit_types', 'association_mode')) {
                $table->string('association_mode', 10)->default('any')->after('required_sub_categories');
            }
        });
    }

    public function down(): void
    {
        Schema::table('benefit_types', function (Blueprint $table) {
            $table->dropColumn(['required_sectors', 'required_sub_categories', 'association_mode']);
        });
    }
};
