<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Fix orders table - add missing columns
        Schema::table('orders', function (Blueprint $table) {
            if (!Schema::hasColumn('orders', 'delivery_fee'))    $table->decimal('delivery_fee', 10, 2)->nullable();
            if (!Schema::hasColumn('orders', 'coupon_discount')) $table->decimal('coupon_discount', 10, 2)->nullable();
            if (!Schema::hasColumn('orders', 'status_history'))  $table->text('status_history')->nullable();
            if (!Schema::hasColumn('orders', 'invoice_number'))  $table->string('invoice_number', 100)->nullable();
            if (!Schema::hasColumn('orders', 'customer_email'))  $table->string('customer_email', 255)->nullable();
            if (!Schema::hasColumn('orders', 'order_number'))    $table->string('order_number', 100)->nullable();
            if (!Schema::hasColumn('orders', 'address'))         $table->string('address', 500)->nullable();
        });

        // Fix users table - add missing columns
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'full_name'))       $table->string('full_name', 255)->nullable();
            if (!Schema::hasColumn('users', 'hashed_password')) $table->string('hashed_password', 255)->nullable();
            if (!Schema::hasColumn('users', 'avatar_url'))      $table->string('avatar_url', 1000)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            foreach (['delivery_fee','coupon_discount','status_history','invoice_number','customer_email','order_number','address'] as $col) {
                if (Schema::hasColumn('orders', $col)) $table->dropColumn($col);
            }
        });

        Schema::table('users', function (Blueprint $table) {
            foreach (['full_name','hashed_password','avatar_url'] as $col) {
                if (Schema::hasColumn('users', $col)) $table->dropColumn($col);
            }
        });
    }
};
