<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EducationalAttainment extends Model
{
    protected $table = 'educational_attainment';

    protected $fillable = ['level', 'is_enabled', 'sort_order'];

    public $timestamps = false;
}
