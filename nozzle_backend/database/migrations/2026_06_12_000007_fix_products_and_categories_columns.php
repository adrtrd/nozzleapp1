<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Fix categories table
        Schema::table('categories', function (Blueprint $table) {
            if (!Schema::hasColumn('categories', 'icon_url'))        $table->string('icon_url', 1000)->nullable();
            if (!Schema::hasColumn('categories', 'image_url'))       $table->string('image_url', 1000)->nullable();
            if (!Schema::hasColumn('categories', 'seo_title'))       $table->string('seo_title', 255)->nullable();
            if (!Schema::hasColumn('categories', 'seo_description')) $table->text('seo_description')->nullable();
        });

        DB::statement("UPDATE categories SET icon_url = icon WHERE icon_url IS NULL AND icon IS NOT NULL");
        DB::statement("UPDATE categories SET image_url = image WHERE image_url IS NULL AND image IS NOT NULL");

        // Fix products table
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'image_url'))       $table->string('image_url', 1000)->nullable();
            if (!Schema::hasColumn('products', 'subcategory_id'))  $table->unsignedBigInteger('subcategory_id')->nullable();
            if (!Schema::hasColumn('products', 'tax_rate'))        $table->decimal('tax_rate', 5, 2)->default(0);
            if (!Schema::hasColumn('products', 'variants'))        $table->text('variants')->nullable();
            if (!Schema::hasColumn('products', 'seo_title'))       $table->string('seo_title', 255)->nullable();
            if (!Schema::hasColumn('products', 'seo_description')) $table->text('seo_description')->nullable();
        });

        DB::statement("UPDATE products SET image_url = image WHERE image_url IS NULL AND image IS NOT NULL");
    }

    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            foreach (['icon_url','image_url','seo_title','seo_description'] as $col) {
                if (Schema::hasColumn('categories', $col)) $table->dropColumn($col);
            }
        });
        Schema::table('products', function (Blueprint $table) {
            foreach (['image_url','subcategory_id','tax_rate','variants','seo_title','seo_description'] as $col) {
                if (Schema::hasColumn('products', $col)) $table->dropColumn($col);
            }
        });
    }
};
