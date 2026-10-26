<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('coupons', function (Blueprint $table) {
            if (!Schema::hasColumn('coupons', 'discount_type'))      $table->string('discount_type', 50)->nullable();
            if (!Schema::hasColumn('coupons', 'min_order_value'))    $table->decimal('min_order_value', 10, 2)->nullable();
            if (!Schema::hasColumn('coupons', 'max_discount_value')) $table->decimal('max_discount_value', 10, 2)->nullable();
            if (!Schema::hasColumn('coupons', 'start_date'))         $table->timestamp('start_date')->nullable();
            if (!Schema::hasColumn('coupons', 'end_date'))           $table->timestamp('end_date')->nullable();
            if (!Schema::hasColumn('coupons', 'usage_count'))        $table->integer('usage_count')->default(0);
            if (!Schema::hasColumn('coupons', 'usage_limit'))        $table->integer('usage_limit')->nullable();
            if (!Schema::hasColumn('coupons', 'product_ids'))        $table->text('product_ids')->nullable();
            if (!Schema::hasColumn('coupons', 'category_ids'))       $table->text('category_ids')->nullable();
            if (!Schema::hasColumn('coupons', 'buy_x'))              $table->integer('buy_x')->nullable();
            if (!Schema::hasColumn('coupons', 'get_y'))              $table->integer('get_y')->nullable();
            if (!Schema::hasColumn('coupons', 'get_y_discount'))     $table->decimal('get_y_discount', 10, 2)->nullable();
        });

        // Copy existing data from old column names to new column names
        DB::statement("UPDATE coupons SET discount_type = type WHERE discount_type IS NULL AND type IS NOT NULL");
        DB::statement("UPDATE coupons SET min_order_value = min_cart_value WHERE min_order_value IS NULL AND min_cart_value IS NOT NULL");
        DB::statement("UPDATE coupons SET max_discount_value = max_discount WHERE max_discount_value IS NULL AND max_discount IS NOT NULL");
        DB::statement("UPDATE coupons SET start_date = starts_at WHERE start_date IS NULL AND starts_at IS NOT NULL");
        DB::statement("UPDATE coupons SET end_date = expires_at WHERE end_date IS NULL AND expires_at IS NOT NULL");
        DB::statement("UPDATE coupons SET usage_count = used_count WHERE usage_count = 0 AND used_count > 0");
        DB::statement("UPDATE coupons SET usage_limit = usage_limit WHERE usage_limit IS NULL AND usage_limit IS NOT NULL");
    }

    public function down(): void
    {
        Schema::table('coupons', function (Blueprint $table) {
            $cols = ['discount_type','min_order_value','max_discount_value','start_date','end_date',
                     'usage_count','usage_limit','product_ids','category_ids','buy_x','get_y','get_y_discount'];
            foreach ($cols as $col) {
                if (Schema::hasColumn('coupons', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
