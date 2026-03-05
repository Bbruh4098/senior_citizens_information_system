<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AnnouncementType extends Model
{
    protected $table = 'announcement_types';

    protected $fillable = ['name', 'code', 'description', 'is_enabled', 'sort_order'];

    public function announcements()
    {
        return $this->hasMany(Announcement::class, 'type_id');
    }
}
