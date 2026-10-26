<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdminNotification extends Model
{
    protected $table = 'admin_notifications';
    protected $guarded = [];

    protected $casts = [
        'scheduled_at' => 'datetime',
    ];
}
