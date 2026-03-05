<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\SeniorCitizen;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

class ReplaceDamagedController extends Controller
{
    /**
     * Search for a senior citizen by OSCA ID.
     * Returns senior data for damaged ID replacement.
     */
    public function search(Request $request)
    {
        $request->validate([
            'osca_id' => 'required|string',
        ]);

        $oscaId = trim($request->osca_id);

        $senior = SeniorCitizen::where('osca_id', $oscaId)
            ->with(['barangay', 'gender', 'civilStatus', 'contact', 'educationalAttainment', 'branch'])
            ->first();

        if (!$senior) {
            return response()->json([
                'success' => false,
                'message' => 'No senior citizen found with OSCA ID: ' . $oscaId,
            ], 404);
        }

        if (!$senior->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'This senior citizen record is inactive.',
            ], 400);
        }

        if ($senior->is_deceased) {
            return response()->json([
                'success' => false,
                'message' => 'This senior citizen is marked as deceased.',
            ], 400);
        }

        // Check for existing pending replace damaged application
        $existingApplication = Application::where('senior_id', $senior->id)
            ->where('application_type_id', 4) // Replace Damaged type
            ->whereNotIn('status', ['Approved', 'Rejected', 'Claimed'])
            ->first();

        if ($existingApplication) {
            return response()->json([
                'success' => false,
                'message' => 'This senior already has a pending replace damaged ID application.',
                'existing_application' => [
                    'application_number' => $existingApplication->application_number,
                    'status' => $existingApplication->status,
                ],
            ], 409);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $senior->id,
                'osca_id' => $senior->osca_id,
                'first_name' => $senior->first_name,
                'middle_name' => $senior->middle_name,
                'last_name' => $senior->last_name,
                'extension' => $senior->extension,
                'full_name' => $senior->full_name,
                'birthdate' => $senior->birthdate?->format('Y-m-d'),
                'age' => $senior->age,
                'gender_id' => $senior->gender_id,
                'gender' => $senior->gender,
                'civil_status_id' => $senior->civil_status_id,
                'civil_status' => $senior->civilStatus,
                'barangay_id' => $senior->barangay_id,
                'barangay' => $senior->barangay?->name,
                'branch_id' => $senior->branch_id,
                'branch' => $senior->branch?->name,
                'registration_date' => $senior->registration_date?->format('Y-m-d'),
                'contact' => $senior->contact ? [
                    'house_number' => $senior->contact->house_number,
                    'street' => $senior->contact->street,
                    'mobile_number' => $senior->contact->mobile_number,
                    'telephone_number' => $senior->contact->telephone_number,
                ] : null,
                'photo_path' => $senior->photo_path,
            ],
        ]);
    }

    /**
     * Store a new replace damaged ID application.
     */
    public function store(Request $request)
    {
        $isDraft = $request->boolean('save_as_draft', false);

        $rules = [
            'senior_id' => 'required|exists:senior_citizens,id',
            'save_as_draft' => 'nullable|boolean',
            'verified_ready' => 'nullable|boolean',
        ];

        $validated = $request->validate($rules);

        try {
            DB::beginTransaction();

            $user = $request->user();
            $senior = SeniorCitizen::findOrFail($request->senior_id);

            // Generate unique application number for replace damaged
            $year = date('Y');
            $prefix = "DMG-{$year}-";
            
            $lastApp = Application::where('application_number', 'like', "{$prefix}%")
                ->orderByRaw("CAST(SUBSTRING(application_number, -5) AS UNSIGNED) DESC")
                ->first();
            
            $nextNumber = 1;
            if ($lastApp) {
                $lastNumber = (int) substr($lastApp->application_number, -5);
                $nextNumber = $lastNumber + 1;
            }
            
            $applicationNumber = sprintf('DMG-%s-%05d', $year, $nextNumber);

            $applicantData = [
                'personal_info' => [
                    'first_name' => $senior->first_name,
                    'middle_name' => $senior->middle_name,
                    'last_name' => $senior->last_name,
                    'extension' => $senior->extension,
                    'birthdate' => $senior->birthdate?->format('Y-m-d'),
                    'gender_id' => $senior->gender_id,
                    'barangay_id' => $senior->barangay_id,
                ],
                'contact_info' => [
                    'house_number' => $senior->contact?->house_number,
                    'street' => $senior->contact?->street,
                    'mobile_number' => $senior->contact?->mobile_number,
                    'telephone_number' => $senior->contact?->telephone_number,
                ],
            'replace_damaged_info' => [
                    'verified_ready' => $request->boolean('verified_ready', false),
                    'surrender_damaged_id' => $request->boolean('surrender_damaged_id', false),
                    'original_osca_id' => $senior->osca_id,
                    'original_registration_date' => $senior->registration_date?->format('Y-m-d'),
                ],
            ];

            $status = $isDraft ? 'Draft' : 'For Verification';

            $application = Application::create([
                'application_number' => $applicationNumber,
                'senior_id' => $senior->id,
                'application_type_id' => 4, // Replace Damaged type
                'status' => $status,
                'submitted_by' => $user->id,
                'submission_date' => $isDraft ? null : now(),
                'applicant_data' => $applicantData,
                'notes' => null,
            ]);

            DB::commit();

            $successMessage = $isDraft 
                ? 'Replace Damaged ID application saved as draft' 
                : 'Replace Damaged ID application submitted for verification';

            return response()->json([
                'success' => true,
                'message' => $successMessage,
                'data' => [
                    'application_id' => $application->id,
                    'application_number' => $applicationNumber,
                    'status' => $status,
                    'senior_osca_id' => $senior->osca_id,
                ],
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            
            \Log::error('Replace Damaged ID submission failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request' => $request->all(),
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to submit application: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get replace damaged application for editing.
     */
    public function show($id)
    {
        $application = Application::with(['applicationType', 'senior'])
            ->where('application_type_id', 4)
            ->findOrFail($id);
        
        return response()->json([
            'success' => true,
            'data' => [
                'id' => $application->id,
                'application_number' => $application->application_number,
                'status' => $application->status,
                'senior_id' => $application->senior_id,
                'senior_osca_id' => $application->senior?->osca_id,
                'applicant_data' => $application->applicant_data,
                'application_type_id' => $application->application_type_id,
                'submission_date' => $application->submission_date,
                'is_editable' => $application->isEditable(),
            ],
        ]);
    }

    /**
     * Update an existing replace damaged application.
     */
    public function update(Request $request, $id)
    {
        $application = Application::where('application_type_id', 4)->findOrFail($id);
        
        if (!$application->isEditable()) {
            return response()->json([
                'success' => false,
                'message' => 'This application cannot be edited.',
            ], 403);
        }

        $isDraft = $request->boolean('save_as_draft', false);
        $request->validate(['save_as_draft' => 'nullable|boolean', 'verified_ready' => 'nullable|boolean']);

        try {
            $senior = $application->senior;

            $applicantData = $application->applicant_data ?? [];
            $applicantData['replace_damaged_info'] = [
                'verified_ready' => $request->boolean('verified_ready', false),
                'surrender_damaged_id' => $request->boolean('surrender_damaged_id', false),
                'original_osca_id' => $senior?->osca_id,
                'original_registration_date' => $senior?->registration_date?->format('Y-m-d'),
            ];

            $status = $isDraft ? 'Draft' : 'For Verification';

            $application->update([
                'applicant_data' => $applicantData,
                'status' => $status,
                'submission_date' => $isDraft ? null : now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => $isDraft ? 'Draft updated successfully' : 'Application submitted for verification',
                'data' => [
                    'application_id' => $application->id,
                    'application_number' => $application->application_number,
                    'status' => $status,
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update application: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Upload document for a replace damaged application.
     * Document types: 5=Old ID Photocopy, 2=Barangay Cert, 1=Birth Cert, 4=Photo
     */
    public function uploadDocument(Request $request)
    {
        $request->validate([
            'application_id' => 'required|exists:applications,id',
            'document_type_id' => 'required|integer|in:1,2,4,5',
            'file' => 'required|file|max:5120|mimes:jpg,jpeg,png,pdf',
        ]);

        try {
            $file = $request->file('file');
            $application = Application::findOrFail($request->application_id);

            if ($application->application_type_id !== 4) {
                return response()->json([
                    'success' => false,
                    'message' => 'This endpoint is for replace damaged applications only.',
                ], 400);
            }

            $extension = $file->getClientOriginalExtension();
            $filename = time() . '_' . uniqid() . '.' . $extension;
            
            $path = $file->storeAs(
                'uploads/applications/' . $application->id,
                $filename,
                'public'
            );

            DB::table('application_documents')
                ->where('application_id', $application->id)
                ->where('document_type_id', $request->document_type_id)
                ->delete();

            $documentId = DB::table('application_documents')->insertGetId([
                'application_id' => $application->id,
                'document_type_id' => $request->document_type_id,
                'file_path' => $path,
                'original_filename' => $file->getClientOriginalName(),
                'file_size' => $file->getSize(),
                'uploaded_by' => $request->user()->id,
                'uploaded_at' => now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Document uploaded successfully',
                'data' => [
                    'id' => $documentId,
                    'document_type_id' => $request->document_type_id,
                    'file_path' => $path,
                    'original_filename' => $file->getClientOriginalName(),
                    'url' => asset('storage/' . $path),
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload document: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete a document.
     */
    public function deleteDocument(Request $request, $documentId)
    {
        try {
            $document = DB::table('application_documents')->find($documentId);
            
            if (!$document) {
                return response()->json(['success' => false, 'message' => 'Document not found'], 404);
            }

            Storage::disk('public')->delete($document->file_path);
            DB::table('application_documents')->where('id', $documentId)->delete();

            return response()->json(['success' => true, 'message' => 'Document deleted successfully']);

        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Failed to delete document'], 500);
        }
    }

    /**
     * Get documents for a replace damaged application.
     */
    public function getDocuments($applicationId)
    {
        $documents = DB::table('application_documents')
            ->where('application_id', $applicationId)
            ->get()
            ->map(function ($doc) {
                $doc->url = asset('storage/' . $doc->file_path);
                return $doc;
            });

        return response()->json(['success' => true, 'data' => $documents]);
    }
}
