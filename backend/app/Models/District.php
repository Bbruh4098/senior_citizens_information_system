<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class District extends Model
{
    protected $fillable = [
        'name',
        'description',
    ];

    /* Get barangays that belong to this district (matched by name string). */
    public function barangays()
    {
        return $this->hasMany(Barangay::class, 'district', 'name');
    }
}
