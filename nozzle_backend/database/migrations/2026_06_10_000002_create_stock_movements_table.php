<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('product_id')->nullable();
            $table->string('type')->nullable();
            $table->integer('quantity_change')->default(0);
            $table->integer('quantity_before')->default(0);
            $table->integer('quantity_after')->default(0);
            $table->string('reason')->nullable();
            $table->string('invoice_number')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamp('created_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};
