<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('benefit_complaints')) {
            // Table already exists on Railway (partially created).
            // Fix the senior_id column type from unsignedBigInteger to int,
            // then add foreign keys if missing.
            try {
                DB::statement('ALTER TABLE `benefit_complaints` MODIFY `senior_id` int NOT NULL');
            } catch (\Exception $e) {}

            try {
                DB::statement('ALTER TABLE `benefit_complaints` ADD CONSTRAINT `benefit_complaints_senior_id_foreign` FOREIGN KEY (`senior_id`) REFERENCES `senior_citizens` (`id`) ON DELETE CASCADE');
            } catch (\Exception $e) {}

            try {
                DB::statement('ALTER TABLE `benefit_complaints` ADD CONSTRAINT `benefit_complaints_benefit_claim_id_foreign` FOREIGN KEY (`benefit_claim_id`) REFERENCES `benefit_claims` (`id`) ON DELETE SET NULL');
            } catch (\Exception $e) {}

            try {
                DB::statement('ALTER TABLE `benefit_complaints` ADD CONSTRAINT `benefit_complaints_responded_by_foreign` FOREIGN KEY (`responded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL');
            } catch (\Exception $e) {}

            try {
                DB::statement('ALTER TABLE `benefit_complaints` ADD INDEX `benefit_complaints_status_index` (`status`)');
            } catch (\Exception $e) {}

            try {
                DB::statement('ALTER TABLE `benefit_complaints` ADD INDEX `benefit_complaints_created_at_index` (`created_at`)');
            } catch (\Exception $e) {}

            return;
        }

        Schema::create('benefit_complaints', function (Blueprint $table) {
            $table->id();
            // senior_citizens.id is int (signed), NOT bigint unsigned
            $table->integer('senior_id');
            $table->unsignedBigInteger('benefit_claim_id')->nullable();
            $table->string('subject');
            $table->text('message');
            $table->enum('status', ['open', 'in_review', 'resolved', 'closed'])->default('open');
            $table->text('admin_response')->nullable();
            $table->unsignedBigInteger('responded_by')->nullable();
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();

            $table->foreign('senior_id')->references('id')->on('senior_citizens')->onDelete('cascade');
            $table->foreign('benefit_claim_id')->references('id')->on('benefit_claims')->onDelete('set null');
            $table->foreign('responded_by')->references('id')->on('users')->onDelete('set null');

            $table->index('status');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('benefit_complaints');
    }
};
