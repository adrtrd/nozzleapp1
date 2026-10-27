<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class ServiceBooking extends Model
{
    use HasFactory;

    protected $table = 'service_requests';
    protected $guarded = [];
    public $timestamps = false; // We set created_at and updated_at manually or let boot hook handle it since SQLite schema lacks standard laravel types sometimes

    private static bool $schemaChecked = false;

    public static function ensureSchema(): void
    {
        if (self::$schemaChecked) {
            return;
        }
        self::$schemaChecked = true;

        try {
            if (Schema::hasTable('service_requests')) {
                Schema::table('service_requests', function (Blueprint $table) {
                    if (!Schema::hasColumn('service_requests', 'user_id')) {
                        $table->unsignedBigInteger('user_id')->nullable();
                    }
                    if (!Schema::hasColumn('service_requests', 'completed_at')) {
                        $table->timestamp('completed_at')->nullable();
                    }
                    if (!Schema::hasColumn('service_requests', 'admin_notes')) {
                        $table->text('admin_notes')->nullable();
                    }
                });
            }

            if (Schema::hasTable('service_request_status_history')) {
                Schema::table('service_request_status_history', function (Blueprint $table) {
                    if (!Schema::hasColumn('service_request_status_history', 'note')) {
                        $table->text('note')->nullable();
                    }
                });
            }
        } catch (\Throwable $e) {
            // Ignore schema check errors if DB is read-only
        }
    }

    protected static function boot()
    {
        parent::boot();

        self::ensureSchema();

        static::creating(function ($model) {
            if (!$model->created_at) {
                $model->created_at = now()->toDateTimeString();
            }
            if (!$model->updated_at) {
                $model->updated_at = now()->toDateTimeString();
            }
        });

        static::updating(function ($model) {
            $model->updated_at = now()->toDateTimeString();
        });
    }

    protected $casts = [
        'scheduled_date' => 'string',
        'scheduled_time' => 'string',
        'latitude' => 'float',
        'longitude' => 'float',
        'total_price' => 'float',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function service()
    {
        return $this->belongsTo(Service::class, 'service_id');
    }

    public function option()
    {
        return $this->belongsTo(ServiceOption::class, 'service_option_id');
    }

    public function status_history()
    {
        return $this->hasMany(ServiceRequestStatusHistory::class, 'service_request_id');
    }
}
