<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BenefitType extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'min_age',
        'max_age',
        'amount',
        'is_one_time',
        'claim_interval_days',
        'target_scope',
        'branch_id',
        'district_id',
        'created_by',
        'is_active',
        'required_sectors',
        'required_sub_categories',
        'association_mode',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'is_one_time' => 'boolean',
        'is_active' => 'boolean',
        'claim_interval_days' => 'integer',
        'required_sectors' => 'array',
        'required_sub_categories' => 'array',
    ];

    /**
     * Get all claims for this benefit type.
     */
    public function claims()
    {
        return $this->hasMany(BenefitClaim::class);
    }

    /**
     * Get the targeted barangays for this benefit.
     */
    public function barangays()
    {
        return $this->belongsToMany(Barangay::class, 'benefit_type_barangays')
            ->withTimestamps();
    }

    /**
     * Get the branch (field office) this benefit is limited to.
     */
    public function branch()
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    /**
     * Get the district this benefit is limited to.
     */
    public function district()
    {
        return $this->belongsTo(District::class, 'district_id');
    }

    /**
     * Get the user who created this benefit type.
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Check if a senior is eligible for this benefit based on age.
     */
    public function isEligibleForAge(int $age): bool
    {
        return $age >= $this->min_age;
    }

    /**
     * Check if a senior in a specific barangay is eligible for this benefit.
     */
    public function isEligibleForBarangay(int $barangayId): bool
    {
        if ($this->target_scope === 'all') {
            return true;
        }

        if ($this->target_scope === 'branch' && $this->branch_id) {
            // If specific barangays were selected for this branch, use them
            if ($this->barangays()->count() > 0) {
                return $this->barangays()->where('barangays.id', $barangayId)->exists();
            }
            // Otherwise check all barangays under the branch
            return Barangay::where('id', $barangayId)
                ->whereHas('branches', function ($q) {
                    $q->where('branches.id', $this->branch_id);
                })
                ->exists();
        }

        if ($this->target_scope === 'barangays') {
            return $this->barangays()->where('barangays.id', $barangayId)->exists();
        }

        if ($this->target_scope === 'district' && $this->district_id) {
            // If specific barangays were selected for this district, use them
            if ($this->barangays()->count() > 0) {
                return $this->barangays()->where('barangays.id', $barangayId)->exists();
            }
            // Otherwise check all barangays under the district
            $district = District::find($this->district_id);
            if ($district) {
                return Barangay::where('id', $barangayId)
                    ->where('district', $district->name)
                    ->exists();
            }
            return false;
        }

        return false;
    }

    /**
     * Check if a senior is eligible based on target sectors / sub-categories.
     */
    public function isEligibleForAssociation(SeniorCitizen $senior): bool
    {
        $requiredSectors = $this->required_sectors ?? [];
        $requiredSubCats = $this->required_sub_categories ?? [];

        // No restrictions = everyone eligible
        if (empty($requiredSectors) && empty($requiredSubCats)) {
            return true;
        }

        $seniorSectors = $senior->target_sectors ?? [];
        $seniorSubCats = $senior->sub_categories ?? [];

        if ($this->association_mode === 'all') {
            // Senior must have ALL required sectors AND ALL required sub-categories
            foreach ($requiredSectors as $sector) {
                if (!in_array($sector, $seniorSectors)) {
                    return false;
                }
            }
            foreach ($requiredSubCats as $subCat) {
                if (!in_array($subCat, $seniorSubCats)) {
                    return false;
                }
            }
            return true;
        }

        // 'any' mode: senior must match at least ONE from either list
        foreach ($requiredSectors as $sector) {
            if (in_array($sector, $seniorSectors)) {
                return true;
            }
        }
        foreach ($requiredSubCats as $subCat) {
            if (in_array($subCat, $seniorSubCats)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if a senior can claim this benefit based on frequency.
     */
    public function canClaimAgain(int $seniorId): bool
    {
        if ($this->is_one_time) {
            return !$this->claims()->where('senior_id', $seniorId)->exists();
        }

        if (!$this->claim_interval_days || $this->claim_interval_days <= 0) {
            return true;
        }

        $lastClaim = $this->claims()
            ->where('senior_id', $seniorId)
            ->latest('claim_date')
            ->first();

        if (!$lastClaim) {
            return true;
        }

        $daysSinceLastClaim = now()->diffInDays($lastClaim->claim_date);
        return $daysSinceLastClaim >= $this->claim_interval_days;
    }

    /**
     * Scope to get only active benefit types.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to filter benefits accessible by user jurisdiction.
     */
    public function scopeAccessibleBy($query, $user)
    {
        if ($user->isMainAdmin()) {
            return $query;
        }

        $branchIds = $user->branch_id ? [$user->branch_id] : [];
        $barangayIds = $user->getAccessibleBarangayIds();

        return $query->where(function ($q) use ($branchIds, $barangayIds) {
            $q->where('target_scope', 'all')
                ->orWhere(function ($q2) use ($branchIds) {
                    $q2->where('target_scope', 'branch')
                        ->whereIn('branch_id', $branchIds);
                })
                ->orWhere(function ($q2) use ($barangayIds) {
                    $q2->where('target_scope', 'barangays')
                        ->whereHas('barangays', function ($q3) use ($barangayIds) {
                            $q3->whereIn('barangays.id', $barangayIds);
                        });
                })
                ->orWhere('target_scope', 'district');
        });
    }

    /**
     * Get the age range as a formatted string.
     */
    public function getAgeRangeAttribute(): string
    {
        if ($this->max_age === null) {
            return "{$this->min_age}+";
        }
        return "{$this->min_age}-{$this->max_age}";
    }

    /**
     * Get formatted amount with currency.
     */
    public function getFormattedAmountAttribute(): string
    {
        if ($this->amount == 0) {
            return '—';
        }
        return '₱' . number_format($this->amount, 2);
    }

    /**
     * Get frequency description.
     */
    public function getFrequencyDescriptionAttribute(): string
    {
        if ($this->is_one_time) {
            return 'One-time only';
        }
        if (!$this->claim_interval_days || $this->claim_interval_days <= 0) {
            return 'No limit';
        }
        if ($this->claim_interval_days === 30) {
            return 'Monthly';
        }
        if ($this->claim_interval_days === 90) {
            return 'Quarterly';
        }
        if ($this->claim_interval_days === 365) {
            return 'Yearly';
        }
        return "Every {$this->claim_interval_days} days";
    }
}
