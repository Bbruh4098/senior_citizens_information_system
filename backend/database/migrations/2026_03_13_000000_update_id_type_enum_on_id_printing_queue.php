<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE id_printing_queue MODIFY COLUMN id_type ENUM('new','renewal','replacement','replace_lost','replace_damaged') NOT NULL DEFAULT 'new'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE id_printing_queue MODIFY COLUMN id_type ENUM('new','renewal','replacement') NOT NULL DEFAULT 'new'");
    }
};
