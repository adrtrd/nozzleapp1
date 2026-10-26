<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('admin_notifications')) {
            Schema::create('admin_notifications', function (Blueprint $table) {
                $table->id();
                $table->string('title');
                $table->text('body');
                $table->string('image_url')->nullable();
                $table->string('target_type')->default('all');
                $table->string('target_id')->nullable();
                $table->string('status')->default('sent');
                $table->timestamp('scheduled_at')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_notifications');
    }
};
