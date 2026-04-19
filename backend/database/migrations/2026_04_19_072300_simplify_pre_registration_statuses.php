<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    //Simplify pre-registration statuses and clear old data.
    
    public function up(): void
    {
        // Clear all existing pre-registrations (old status data truncation)
        DB::table('pre_registrations')->truncate();
    }

    public function down(): void
    {
        DB::table('pre_registrations')
            ->where('status', 'for_verification')
            ->update(['status' => 'pending']);
            
        DB::table('pre_registrations')
            ->where('status', 'for_approval')
            ->update(['status' => 'fo_verified']);
    }
};
