<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('service_requests', function (Blueprint $table) {
            if (!Schema::hasColumn('service_requests', 'completed_at')) $table->timestamp('completed_at')->nullable();
            if (!Schema::hasColumn('service_requests', 'admin_notes'))  $table->text('admin_notes')->nullable();
        });

        // Add 'note' alias column to service_request_status_history (controller uses 'note', DB has 'notes')
        Schema::table('service_request_status_history', function (Blueprint $table) {
            if (!Schema::hasColumn('service_request_status_history', 'note')) {
                $table->text('note')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('service_requests', function (Blueprint $table) {
            if (Schema::hasColumn('service_requests', 'completed_at')) $table->dropColumn('completed_at');
            if (Schema::hasColumn('service_requests', 'admin_notes'))  $table->dropColumn('admin_notes');
        });
        Schema::table('service_request_status_history', function (Blueprint $table) {
            if (Schema::hasColumn('service_request_status_history', 'note')) $table->dropColumn('note');
        });
    }
};
