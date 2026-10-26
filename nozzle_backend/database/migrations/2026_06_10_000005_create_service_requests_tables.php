<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('service_options')) {
            Schema::create('service_options', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('service_id')->nullable();
                $table->string('name')->nullable();
                $table->text('description')->nullable();
                $table->decimal('extra_price', 12, 2)->default(0);
                $table->integer('duration_extra_minutes')->default(0);
                $table->integer('sort_order')->default(0);
                $table->boolean('is_active')->default(true);
            });
        }

        if (!Schema::hasTable('service_requests')) {
            Schema::create('service_requests', function (Blueprint $table) {
                $table->id();
                $table->string('request_number')->nullable();
                $table->unsignedBigInteger('user_id')->nullable();
                $table->unsignedBigInteger('service_id')->nullable();
                $table->unsignedBigInteger('service_option_id')->nullable();
                $table->string('customer_name')->nullable();
                $table->string('customer_phone')->nullable();
                $table->string('address')->nullable();
                $table->float('latitude')->nullable();
                $table->float('longitude')->nullable();
                $table->string('scheduled_date')->nullable();
                $table->string('scheduled_time')->nullable();
                $table->text('notes')->nullable();
                $table->string('status')->default('new');
                $table->decimal('total_price', 12, 2)->default(0);
                $table->string('payment_method')->nullable();
                $table->string('payment_status')->nullable();
                $table->string('assigned_worker')->nullable();
                $table->string('worker_phone')->nullable();
                $table->timestamp('created_at')->nullable();
                $table->timestamp('updated_at')->nullable();
            });
        }

        if (!Schema::hasTable('service_request_status_history')) {
            Schema::create('service_request_status_history', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('service_request_id')->nullable();
                $table->string('old_status')->nullable();
                $table->string('new_status')->nullable();
                $table->string('changed_by')->nullable();
                $table->text('notes')->nullable();
                $table->boolean('notify_customer')->default(false);
                $table->timestamp('created_at')->nullable();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('service_request_status_history');
        Schema::dropIfExists('service_requests');
        Schema::dropIfExists('service_options');
    }
};
