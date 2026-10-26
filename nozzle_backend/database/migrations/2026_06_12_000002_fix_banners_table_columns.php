<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('banners', function (Blueprint $table) {
            if (!Schema::hasColumn('banners', 'image_url'))        $table->string('image_url', 1000)->nullable();
            if (!Schema::hasColumn('banners', 'mobile_image_url')) $table->string('mobile_image_url', 1000)->nullable();
            if (!Schema::hasColumn('banners', 'external_url'))     $table->string('external_url', 1000)->nullable();
            if (!Schema::hasColumn('banners', 'text_alignment'))   $table->string('text_alignment', 20)->default('center');
            if (!Schema::hasColumn('banners', 'text_color'))       $table->string('text_color', 20)->default('#ffffff');
            if (!Schema::hasColumn('banners', 'overlay_color'))    $table->string('overlay_color', 20)->default('#000000');
            if (!Schema::hasColumn('banners', 'overlay_opacity'))  $table->decimal('overlay_opacity', 3, 2)->default(0.40);
            if (!Schema::hasColumn('banners', 'button_text'))      $table->string('button_text', 100)->nullable();
            if (!Schema::hasColumn('banners', 'start_date'))       $table->timestamp('start_date')->nullable();
            if (!Schema::hasColumn('banners', 'end_date'))         $table->timestamp('end_date')->nullable();
            if (!Schema::hasColumn('banners', 'views'))            $table->integer('views')->default(0);
            if (!Schema::hasColumn('banners', 'clicks'))           $table->integer('clicks')->default(0);
        });

        // Copy existing image and link_url to new columns
        DB::statement("UPDATE banners SET image_url = image WHERE image_url IS NULL OR image_url = ''");
        DB::statement("UPDATE banners SET external_url = link_url WHERE (external_url IS NULL OR external_url = '') AND link_url IS NOT NULL");
    }

    public function down(): void
    {
        Schema::table('banners', function (Blueprint $table) {
            $cols = ['image_url','mobile_image_url','external_url','text_alignment','text_color',
                     'overlay_color','overlay_opacity','button_text','start_date','end_date','views','clicks'];
            foreach ($cols as $col) {
                if (Schema::hasColumn('banners', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
