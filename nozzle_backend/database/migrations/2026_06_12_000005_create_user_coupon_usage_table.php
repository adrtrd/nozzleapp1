<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('user_coupon_usage')) {
            Schema::create('user_coupon_usage', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id')->nullable();
                $table->string('coupon_code', 100)->nullable();
                $table->decimal('discount_amount', 10, 2)->default(0);
                $table->unsignedBigInteger('order_id')->nullable();
                $table->timestamp('used_at')->nullable();
                $table->timestamps();

                $table->index('user_id');
                $table->index('coupon_code');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('user_coupon_usage');
    }
};
