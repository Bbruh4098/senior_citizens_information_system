<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class FamilyMember extends Model
{
    protected $table = 'family_members';

    public $timestamps = false;

    protected $fillable = [
        'senior_id',
        'first_name',
        'middle_name',
        'last_name',
        'extension',
        'birthdate',
        'relationship',
        'age',
        'monthly_salary',
        'mobile_number',
        'telephone_number',
        'email',
        'created_at',
    ];

    protected $casts = [
        'birthdate' => 'date',
        'monthly_salary' => 'decimal:2',
    ];

    protected $appends = ['computed_age'];

    public function senior()
    {
        return $this->belongsTo(SeniorCitizen::class, 'senior_id');
    }

    public function getComputedAgeAttribute(): ?int
    {
        if ($this->birthdate) {
            return Carbon::parse($this->birthdate)->age;
        }
        return $this->age;
    }
}
