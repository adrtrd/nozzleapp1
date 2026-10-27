<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('service_requests')) {
            Schema::table('service_requests', function (Blueprint $table) {
                if (!Schema::hasColumn('service_requests', 'user_id')) {
                    $table->unsignedBigInteger('user_id')->nullable();
                }
                if (!Schema::hasColumn('service_requests', 'completed_at')) {
                    $table->timestamp('completed_at')->nullable();
                }
                if (!Schema::hasColumn('service_requests', 'admin_notes')) {
                    $table->text('admin_notes')->nullable();
                }
            });
        }

        if (Schema::hasTable('service_request_status_history')) {
            Schema::table('service_request_status_history', function (Blueprint $table) {
                if (!Schema::hasColumn('service_request_status_history', 'note')) {
                    $table->text('note')->nullable();
                }
            });
        }

        if (Schema::hasTable('orders')) {
            Schema::table('orders', function (Blueprint $table) {
                if (!Schema::hasColumn('orders', 'user_id')) {
                    $table->unsignedBigInteger('user_id')->nullable();
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('service_requests') && Schema::hasColumn('service_requests', 'user_id')) {
            Schema::table('service_requests', function (Blueprint $table) {
                $table->dropColumn('user_id');
            });
        }

        if (Schema::hasTable('orders') && Schema::hasColumn('orders', 'user_id')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->dropColumn('user_id');
            });
        }
    }
};
