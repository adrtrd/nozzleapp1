<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'is_deleted')) {
                $table->boolean('is_deleted')->default(false);
            }
            if (!Schema::hasColumn('products', 'stock_quantity')) {
                $table->integer('stock_quantity')->default(0);
            }
            if (!Schema::hasColumn('products', 'reorder_point')) {
                $table->integer('reorder_point')->nullable();
            }
            if (!Schema::hasColumn('products', 'max_stock')) {
                $table->integer('max_stock')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            foreach (['is_deleted', 'stock_quantity', 'reorder_point', 'max_stock'] as $col) {
                if (Schema::hasColumn('products', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
