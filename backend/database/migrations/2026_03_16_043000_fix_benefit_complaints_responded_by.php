<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Drop FK referencing wrong table (users), re-point to admin_users
        try {
            Schema::table('benefit_complaints', function ($table) {
                $table->dropForeign(['responded_by']);
            });
        } catch (\Exception $e) {
            // FK may not exist
        }

        // Match admin_users.id type (int)
        DB::statement('ALTER TABLE benefit_complaints MODIFY responded_by INT NULL');

        try {
            Schema::table('benefit_complaints', function ($table) {
                $table->foreign('responded_by')->references('id')->on('admin_users')->onDelete('set null');
            });
        } catch (\Exception $e) {
            // FK may already exist
        }
    }

    public function down(): void
    {
        //
    }
};
