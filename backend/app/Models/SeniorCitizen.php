<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Carbon\Carbon;

class SeniorCitizen extends Model
{
    protected $table = 'senior_citizens';

    protected $fillable = [
        'osca_id',
        'first_name',
        'middle_name',
        'last_name',
        'extension',
        'birthdate',
        'gender_id',
        'civil_status_id',
        'contact_id',
        'educational_attainment_id',
        'monthly_salary',
        'occupation',
        'other_skills',
        'socioeconomic_status_id',
        'mobility_level_id',
        'barangay_id',
        'branch_id',
        'registration_date',
        'registration_status_id',
        'registered_by',
        'photo_path',
        'thumbmark_verified',
        'is_active',
        'is_deceased',
        'deceased_date',
        'qr_code_path',
    ];

    protected $casts = [
        'birthdate' => 'date',
        'registration_date' => 'date',
        'deceased_date' => 'date',
        'is_active' => 'boolean',
        'is_deceased' => 'boolean',
        'thumbmark_verified' => 'boolean',
        'monthly_salary' => 'decimal:2',
    ];

    protected $appends = ['age', 'full_name'];

    /**
     * Get the senior's age.
     */
    public function getAgeAttribute(): int
    {
        return $this->birthdate ? Carbon::parse($this->birthdate)->age : 0;
    }

    /**
     * Get the senior's full name.
     */
    public function getFullNameAttribute(): string
    {
        $name = $this->first_name;
        if ($this->middle_name) {
            $name .= ' ' . $this->middle_name;
        }
        $name .= ' ' . $this->last_name;
        if ($this->extension) {
            $name .= ' ' . $this->extension;
        }
        return $name;
    }

    // Relationships
    public function gender()
    {
        return $this->belongsTo(Gender::class, 'gender_id');
    }

    public function civilStatus()
    {
        return $this->belongsTo(CivilStatus::class, 'civil_status_id');
    }

    public function barangay()
    {
        return $this->belongsTo(Barangay::class, 'barangay_id');
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    public function contact()
    {
        return $this->belongsTo(Contact::class, 'contact_id');
    }

    public function educationalAttainment()
    {
        return $this->belongsTo(EducationalAttainment::class, 'educational_attainment_id');
    }

    public function socioeconomicStatus()
    {
        return $this->belongsTo(SocioeconomicStatus::class, 'socioeconomic_status_id');
    }

    public function mobilityLevel()
    {
        return $this->belongsTo(MobilityLevel::class, 'mobility_level_id');
    }

    public function registrationStatus()
    {
        return $this->belongsTo(RegistrationStatus::class, 'registration_status_id');
    }

    public function registeredBy()
    {
        return $this->belongsTo(User::class, 'registered_by');
    }

    public function applications()
    {
        return $this->hasMany(Application::class, 'senior_id');
    }

    public function seniorIds()
    {
        return $this->hasMany(SeniorId::class, 'senior_id');
    }

    public function eligibleBenefits()
    {
        return $this->belongsToMany(Benefit::class, 'senior_eligible_benefits', 'senior_id', 'benefit_id')
            ->withPivot('eligible_from', 'eligible_until', 'assigned_date');
    }

    public function benefitTransactions()
    {
        return $this->hasMany(BenefitTransaction::class, 'senior_id');
    }

    public function benefitClaims()
    {
        return $this->hasMany(BenefitClaim::class, 'senior_id');
    }

    public function idPrintingQueue()
    {
        return $this->hasMany(IdPrintingQueue::class, 'senior_id');
    }

    public function complaints()
    {
        return $this->hasMany(Complaint::class, 'complainant_id');
    }

    public function familyMembers()
    {
        return $this->hasMany(FamilyMember::class, 'senior_id');
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true)->where('is_deceased', false);
    }

    public function scopeInBarangay($query, $barangayId)
    {
        return $query->where('barangay_id', $barangayId);
    }

    public function scopeInBranch($query, $branchId)
    {
        return $query->where('branch_id', $branchId);
    }

    public function scopeAccessibleBy($query, User $user)
    {
        if ($user->isMainAdmin()) {
            return $query;
        }

        $barangayIds = $user->getAccessibleBarangayIds();
        return $query->whereIn('barangay_id', $barangayIds);
    }
}
