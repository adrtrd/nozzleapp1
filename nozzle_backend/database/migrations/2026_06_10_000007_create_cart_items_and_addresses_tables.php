<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('cart_items')) {
            Schema::create('cart_items', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id')->nullable();
                $table->string('session_id')->nullable();
                $table->unsignedBigInteger('product_id')->nullable();
                $table->integer('quantity')->default(1);
                $table->text('options')->nullable();
                $table->string('selected_size')->nullable();
                $table->string('selected_color')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('addresses')) {
            Schema::create('addresses', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id')->nullable();
                $table->string('title')->nullable();
                $table->string('recipient_name')->nullable();
                $table->string('recipient_phone')->nullable();
                $table->string('phone_number')->nullable();
                $table->text('address_details')->nullable();
                $table->float('latitude')->nullable();
                $table->float('longitude')->nullable();
                $table->boolean('is_default')->default(false);
                $table->timestamp('created_at')->nullable();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('cart_items');
        Schema::dropIfExists('addresses');
    }
};
