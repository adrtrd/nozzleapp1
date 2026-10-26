<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('services', function (Blueprint $table) {
            if (!Schema::hasColumn('services', 'name'))              $table->string('name')->nullable();
            if (!Schema::hasColumn('services', 'image_url'))         $table->string('image_url', 1000)->nullable();
            if (!Schema::hasColumn('services', 'is_available'))      $table->boolean('is_available')->default(true);
            if (!Schema::hasColumn('services', 'base_price'))        $table->decimal('base_price', 10, 2)->default(0);
            if (!Schema::hasColumn('services', 'short_description')) $table->string('short_description', 500)->nullable();
            if (!Schema::hasColumn('services', 'gallery_urls'))      $table->text('gallery_urls')->nullable();
            if (!Schema::hasColumn('services', 'icon_emoji'))        $table->string('icon_emoji', 10)->nullable();
            if (!Schema::hasColumn('services', 'price_type'))        $table->string('price_type', 50)->default('fixed');
            if (!Schema::hasColumn('services', 'category'))          $table->string('category', 100)->nullable();
            if (!Schema::hasColumn('services', 'tags'))              $table->text('tags')->nullable();
            if (!Schema::hasColumn('services', 'duration_minutes'))  $table->integer('duration_minutes')->default(60);
            if (!Schema::hasColumn('services', 'is_featured'))       $table->boolean('is_featured')->default(false);
            if (!Schema::hasColumn('services', 'working_hours'))     $table->text('working_hours')->nullable();
            if (!Schema::hasColumn('services', 'max_bookings_per_day'))  $table->integer('max_bookings_per_day')->default(10);
            if (!Schema::hasColumn('services', 'advance_booking_days'))  $table->integer('advance_booking_days')->default(30);
            if (!Schema::hasColumn('services', 'rating'))            $table->decimal('rating', 3, 1)->default(5.0);
            if (!Schema::hasColumn('services', 'reviews_count'))     $table->integer('reviews_count')->default(0);
            if (!Schema::hasColumn('services', 'total_bookings'))    $table->integer('total_bookings')->default(0);
        });

        // Copy existing data from old columns to new columns
        DB::statement("UPDATE services SET name = title WHERE name IS NULL OR name = ''");
        DB::statement("UPDATE services SET image_url = image WHERE image_url IS NULL OR image_url = ''");
        DB::statement("UPDATE services SET is_available = is_active WHERE is_available IS NULL OR is_available = ''");
        DB::statement("UPDATE services SET base_price = price WHERE base_price IS NULL OR base_price = 0");
    }

    public function down(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $cols = ['name','image_url','is_available','base_price','short_description','gallery_urls',
                     'icon_emoji','price_type','category','tags','duration_minutes','is_featured',
                     'working_hours','max_bookings_per_day','advance_booking_days','rating','reviews_count','total_bookings'];
            foreach ($cols as $col) {
                if (Schema::hasColumn('services', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
