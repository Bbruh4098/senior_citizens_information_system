<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\SeniorController;
use App\Http\Controllers\Api\ApplicationController;
use App\Http\Controllers\Api\IdPrintingController;
use App\Http\Controllers\Api\AnnouncementController;
use App\Http\Controllers\Api\ArchiveController;
use App\Http\Controllers\Api\RegistrationController;
use App\Http\Controllers\Api\PreRegistrationController;
use App\Http\Controllers\PublicController;
use App\Http\Controllers\SeniorAuthController;
use App\Http\Controllers\Api\BenefitComplaintController;
use App\Http\Controllers\Api\SmsController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group.
|
*/

// ===========================
// PUBLIC ROUTES (No Auth Required)
// ===========================
// Note: CORS is handled by App\Http\Middleware\HandleCors

Route::post('/login', [AuthController::class, 'login']);

// Public Online Application
Route::prefix('public')->group(function () {
    Route::get('/barangays', [PublicController::class, 'barangays']);
    Route::get('/stats', [PublicController::class, 'stats']);
    Route::get('/announcements', [PublicController::class, 'announcements']);
    Route::post('/apply', [PublicController::class, 'apply']);
    Route::get('/status/{referenceNumber}', [PublicController::class, 'checkStatus']);
});



// Senior Portal Authentication (public - no auth required)
Route::prefix('senior')->group(function () {
    Route::post('/request-otp', [SeniorAuthController::class, 'requestOtp']);
    Route::post('/verify-otp', [SeniorAuthController::class, 'verifyOtp']);
    Route::post('/login', [SeniorAuthController::class, 'loginWithPin']);
    Route::get('/profile', [SeniorAuthController::class, 'profile']);
    Route::get('/benefits', [SeniorAuthController::class, 'benefits']);
    Route::get('/dashboard-stats', [SeniorAuthController::class, 'dashboardStats']);

    // Senior Complaints
    Route::post('/complaints', [BenefitComplaintController::class, 'seniorStore']);
    Route::get('/complaints', [BenefitComplaintController::class, 'seniorIndex']);
});

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Dashboard
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
    Route::get('/dashboard/upcoming-events', [DashboardController::class, 'upcomingEvents']);
    Route::get('/dashboard/age-distribution', [DashboardController::class, 'ageDistribution']);
    Route::get('/dashboard/gender-distribution', [DashboardController::class, 'genderDistribution']);
    Route::get('/dashboard/heatmap', [DashboardController::class, 'heatmapData']);

    // Seniors
    Route::get('/seniors', [SeniorController::class, 'index']);
    Route::get('/seniors/statistics', [SeniorController::class, 'statistics']);
    Route::get('/seniors/export', [SeniorController::class, 'export']);
    Route::get('/seniors/{id}', [SeniorController::class, 'show']);
    Route::put('/seniors/{id}', [SeniorController::class, 'update']);

    // Applications
    Route::get('/applications', [ApplicationController::class, 'index']);
    Route::get('/applications/statistics', [ApplicationController::class, 'statistics']);
    Route::get('/applications/{id}', [ApplicationController::class, 'show']);
    Route::patch('/applications/{id}/status', [ApplicationController::class, 'updateStatus']);

    // ID Printing
    Route::get('/id-printing', [IdPrintingController::class, 'index']);
    Route::get('/id-printing/statistics', [IdPrintingController::class, 'statistics']);
    Route::get('/id-printing/available-seniors', [IdPrintingController::class, 'getAvailableSeniors']);
    Route::post('/id-printing/add', [IdPrintingController::class, 'addToQueue']);
    Route::get('/id-printing/{id}/card-data', [IdPrintingController::class, 'getIdCardData']);
    Route::post('/id-printing/batch-card-data', [IdPrintingController::class, 'getBatchCardData']);
    Route::patch('/id-printing/{id}/status', [IdPrintingController::class, 'updateStatus']);
    Route::post('/id-printing/bulk-print', [IdPrintingController::class, 'bulkPrint']);
    Route::post('/id-printing/bulk-claim', [IdPrintingController::class, 'bulkClaim']);

    // Announcements
    Route::get('/announcements', [AnnouncementController::class, 'index']);
    Route::get('/announcements/types', [AnnouncementController::class, 'types']);
    Route::get('/announcements/{id}/media', [AnnouncementController::class, 'mediaIndex']);
    Route::post('/announcements/{id}/media', [AnnouncementController::class, 'uploadMedia']);
    Route::get('/announcements/{id}', [AnnouncementController::class, 'show']);
    Route::post('/announcements', [AnnouncementController::class, 'store']);
    Route::put('/announcements/{id}', [AnnouncementController::class, 'update']);
    Route::delete('/announcements/{id}', [AnnouncementController::class, 'destroy']);
    Route::delete('/announcements/media/{mediaId}', [AnnouncementController::class, 'destroyMedia']);

    // Registration
    Route::prefix('registration')->group(function () {
        Route::get('/lookup-options', [RegistrationController::class, 'lookupOptions']);
        Route::get('/barangays', [RegistrationController::class, 'barangays']);
        Route::post('/check-duplicate', [RegistrationController::class, 'checkDuplicate']);
        Route::get('/search-family-senior', [RegistrationController::class, 'searchFamilySenior']);
        Route::post('/new', [RegistrationController::class, 'store']);
        Route::get('/{id}', [RegistrationController::class, 'show']);
        Route::put('/{id}', [RegistrationController::class, 'update']);
        Route::post('/upload-document', [RegistrationController::class, 'uploadDocument']);
        Route::delete('/document/{id}', [RegistrationController::class, 'deleteDocument']);
        Route::get('/{id}/documents', [RegistrationController::class, 'getDocuments']);
    });

    // Renewal (Renew ID)
    Route::prefix('renew')->group(function () {
        Route::get('/search', [\App\Http\Controllers\Api\RenewalController::class, 'search']);
        Route::post('/new', [\App\Http\Controllers\Api\RenewalController::class, 'store']);
        Route::get('/{id}', [\App\Http\Controllers\Api\RenewalController::class, 'show']);
        Route::put('/{id}', [\App\Http\Controllers\Api\RenewalController::class, 'update']);
        Route::post('/upload-document', [\App\Http\Controllers\Api\RenewalController::class, 'uploadDocument']);
        Route::delete('/document/{id}', [\App\Http\Controllers\Api\RenewalController::class, 'deleteDocument']);
        Route::get('/{id}/documents', [\App\Http\Controllers\Api\RenewalController::class, 'getDocuments']);
    });

    // Replace Lost ID
    Route::prefix('replace-lost')->group(function () {
        Route::get('/search', [\App\Http\Controllers\Api\ReplaceLostController::class, 'search']);
        Route::post('/new', [\App\Http\Controllers\Api\ReplaceLostController::class, 'store']);
        Route::get('/{id}', [\App\Http\Controllers\Api\ReplaceLostController::class, 'show']);
        Route::put('/{id}', [\App\Http\Controllers\Api\ReplaceLostController::class, 'update']);
        Route::post('/upload-document', [\App\Http\Controllers\Api\ReplaceLostController::class, 'uploadDocument']);
        Route::delete('/document/{id}', [\App\Http\Controllers\Api\ReplaceLostController::class, 'deleteDocument']);
        Route::get('/{id}/documents', [\App\Http\Controllers\Api\ReplaceLostController::class, 'getDocuments']);
    });

    // Replace Damaged ID
    Route::prefix('replace-damaged')->group(function () {
        Route::get('/search', [\App\Http\Controllers\Api\ReplaceDamagedController::class, 'search']);
        Route::post('/new', [\App\Http\Controllers\Api\ReplaceDamagedController::class, 'store']);
        Route::get('/{id}', [\App\Http\Controllers\Api\ReplaceDamagedController::class, 'show']);
        Route::put('/{id}', [\App\Http\Controllers\Api\ReplaceDamagedController::class, 'update']);
        Route::post('/upload-document', [\App\Http\Controllers\Api\ReplaceDamagedController::class, 'uploadDocument']);
        Route::delete('/document/{id}', [\App\Http\Controllers\Api\ReplaceDamagedController::class, 'deleteDocument']);
        Route::get('/{id}/documents', [\App\Http\Controllers\Api\ReplaceDamagedController::class, 'getDocuments']);
    });

    // Benefits Module (PRD 4.3)
    Route::prefix('benefits')->group(function () {
        Route::get('/types', [\App\Http\Controllers\Api\BenefitController::class, 'types']);
        Route::get('/claims', [\App\Http\Controllers\Api\BenefitController::class, 'index']);
        Route::get('/claims/export', [\App\Http\Controllers\Api\BenefitController::class, 'exportClaims']);
        Route::get('/eligible', [\App\Http\Controllers\Api\BenefitController::class, 'eligible']);
        Route::get('/eligible/export', [\App\Http\Controllers\Api\BenefitController::class, 'exportEligible']);
        Route::get('/statistics', [\App\Http\Controllers\Api\BenefitController::class, 'statistics']);
        Route::post('/claims', [\App\Http\Controllers\Api\BenefitController::class, 'store']);
        Route::patch('/claims/{id}/status', [\App\Http\Controllers\Api\BenefitController::class, 'updateStatus']);

        // Benefit Complaints (admin)
        Route::get('/complaints', [BenefitComplaintController::class, 'index']);
        Route::get('/complaints/{id}', [BenefitComplaintController::class, 'show']);
        Route::patch('/complaints/{id}/respond', [BenefitComplaintController::class, 'respond']);
    });

    // Get benefit claims for a specific senior
    Route::get('/seniors/{id}/benefits', [\App\Http\Controllers\Api\BenefitController::class, 'seniorClaims']);

    // Pre-registrations (online applications)
    Route::prefix('pre-registrations')->group(function () {
        Route::get('/', [PreRegistrationController::class, 'index']);
        Route::get('/statistics', [PreRegistrationController::class, 'statistics']);
        Route::get('/{id}', [PreRegistrationController::class, 'show']);
        Route::post('/{id}/mark-review', [PreRegistrationController::class, 'markUnderReview']);
        Route::post('/{id}/fo-review', [PreRegistrationController::class, 'foReview']);
        // Convert to application (available to FO and Main Admin)
        Route::post('/{id}/convert', [PreRegistrationController::class, 'convert']);
        Route::post('/{id}/complete-conversion', [PreRegistrationController::class, 'completeConversion']);
    });

    // Main Admin only routes (role_id = 1)
    Route::middleware('role:1')->group(function () {
        // Pre-registration main review (for rejecting)
        Route::post('/pre-registrations/{id}/main-review', [PreRegistrationController::class, 'mainReview']);

        // Account Management
        Route::prefix('admin/accounts')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\AccountController::class, 'index']);
            Route::get('/options', [\App\Http\Controllers\Api\AccountController::class, 'getOptions']);
            Route::get('/barangays-by-branch/{branchId}', [\App\Http\Controllers\Api\AccountController::class, 'getBarangaysByBranch']);
            Route::get('/{id}', [\App\Http\Controllers\Api\AccountController::class, 'show']);
            Route::post('/', [\App\Http\Controllers\Api\AccountController::class, 'store']);
            Route::put('/{id}', [\App\Http\Controllers\Api\AccountController::class, 'update']);
            Route::delete('/{id}', [\App\Http\Controllers\Api\AccountController::class, 'destroy']);
            Route::patch('/{id}/toggle-status', [\App\Http\Controllers\Api\AccountController::class, 'toggleStatus']);
            Route::post('/{id}/reset-password', [\App\Http\Controllers\Api\AccountController::class, 'resetPassword']);
        });

        // Field Office Management
        Route::prefix('admin/branches')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\BranchManagementController::class, 'indexBranches']);
            Route::get('/{id}', [\App\Http\Controllers\Api\BranchManagementController::class, 'showBranch']);
            Route::post('/', [\App\Http\Controllers\Api\BranchManagementController::class, 'storeBranch']);
            Route::put('/{id}', [\App\Http\Controllers\Api\BranchManagementController::class, 'updateBranch']);
            Route::delete('/{id}', [\App\Http\Controllers\Api\BranchManagementController::class, 'destroyBranch']);
        });

        // Barangay Management
        Route::prefix('admin/barangays')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\BranchManagementController::class, 'indexBarangays']);
            Route::get('/unassigned', [\App\Http\Controllers\Api\BranchManagementController::class, 'getUnassignedBarangays']);
            Route::post('/', [\App\Http\Controllers\Api\BranchManagementController::class, 'storeBarangay']);
            Route::put('/{id}', [\App\Http\Controllers\Api\BranchManagementController::class, 'updateBarangay']);
            Route::delete('/{id}', [\App\Http\Controllers\Api\BranchManagementController::class, 'destroyBarangay']);
            Route::post('/assign', [\App\Http\Controllers\Api\BranchManagementController::class, 'assignBarangay']);
            Route::post('/bulk-assign', [\App\Http\Controllers\Api\BranchManagementController::class, 'bulkAssign']);
            Route::delete('/{id}/unassign', [\App\Http\Controllers\Api\BranchManagementController::class, 'unassignBarangay']);
        });

        // District Management
        Route::prefix('admin/districts')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\BranchManagementController::class, 'indexDistricts']);
            Route::post('/', [\App\Http\Controllers\Api\BranchManagementController::class, 'storeDistrict']);
            Route::put('/{id}', [\App\Http\Controllers\Api\BranchManagementController::class, 'updateDistrict']);
            Route::delete('/{id}', [\App\Http\Controllers\Api\BranchManagementController::class, 'destroyDistrict']);
            Route::post('/{id}/assign-barangays', [\App\Http\Controllers\Api\BranchManagementController::class, 'assignDistrictBarangays']);
        });

        // Benefit Type Management
        Route::prefix('admin/benefit-types')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\BenefitController::class, 'allTypes']);
            Route::post('/', [\App\Http\Controllers\Api\BenefitController::class, 'storeBenefitType']);
            Route::put('/{id}', [\App\Http\Controllers\Api\BenefitController::class, 'updateBenefitType']);
            Route::delete('/{id}', [\App\Http\Controllers\Api\BenefitController::class, 'destroyBenefitType']);
            Route::patch('/{id}/toggle', [\App\Http\Controllers\Api\BenefitController::class, 'toggleBenefitType']);
        });
        // Audit Log
        Route::prefix('admin/audit-logs')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\AuditLogController::class, 'index']);
            Route::get('/stats', [\App\Http\Controllers\Api\AuditLogController::class, 'stats']);
            Route::get('/{id}', [\App\Http\Controllers\Api\AuditLogController::class, 'show']);
        });

        // Dropdown / Lookup Management
        Route::get('admin/dropdowns/types', [\App\Http\Controllers\Api\DropdownController::class, 'types']);
        Route::prefix('admin/dropdowns/{type}')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\DropdownController::class, 'index']);
            Route::post('/', [\App\Http\Controllers\Api\DropdownController::class, 'store']);
            Route::put('/{id}', [\App\Http\Controllers\Api\DropdownController::class, 'update']);
            Route::patch('/{id}/toggle', [\App\Http\Controllers\Api\DropdownController::class, 'toggleEnabled']);
            Route::post('/reorder', [\App\Http\Controllers\Api\DropdownController::class, 'reorder']);
        });

        // SMS Settings & Management
        Route::prefix('admin/sms')->group(function () {
            Route::get('/settings', [SmsController::class, 'getSettings']);
            Route::put('/settings', [SmsController::class, 'updateSettings']);
            Route::get('/logs', [SmsController::class, 'getLogs']);
            Route::get('/stats', [SmsController::class, 'getStats']);
            Route::post('/test', [SmsController::class, 'sendTest']);
        });
    });

    // Main Admin and Branch Admin routes (role_id = 1 or 2)
    Route::middleware('role:1,2')->group(function () {
        // Archives (PRD 4.6)
        Route::get('/archives', [ArchiveController::class, 'index']);
        Route::get('/archives/{id}', [ArchiveController::class, 'show']);
        Route::get('/archives/{id}/timeline', [ArchiveController::class, 'timeline']);
    });
});
