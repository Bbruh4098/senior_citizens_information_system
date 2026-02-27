<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\AnnouncementMedia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AnnouncementController extends Controller
{
    /**
     * Get paginated list of announcements.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $perPage = $request->get('per_page', 15);
        
        $query = Announcement::with(['type', 'barangay', 'createdBy']);

        if (!$user->isMainAdmin()) {
            $barangayIds = $user->getAccessibleBarangayIds();
            $query->where(function ($q) use ($barangayIds) {
                $q->whereNull('barangay_id')
                    ->orWhereIn('barangay_id', $barangayIds);
            });
        }

        // Published filter
        if ($request->has('is_published')) {
            $query->where('is_published', $request->boolean('is_published'));
        }

        // Type filter
        if ($typeId = $request->get('type_id')) {
            $query->where('type_id', $typeId);
        }

        // Search
        if ($search = $request->get('search')) {
            $query->where('title', 'like', "%{$search}%");
        }

        $query->orderBy('created_at', 'desc');

        $announcements = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $announcements,
        ]);
    }

    /**
     * Get single announcement.
     */
    public function show($id)
    {
        $announcement = Announcement::with(['type', 'barangay', 'createdBy', 'media'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $announcement,
        ]);
    }

    /**
     * Create announcement.
     */
    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'type_id' => 'required|exists:announcement_types,id',
            'event_date' => 'nullable|date',
            'location' => 'nullable|string|max:255',
            'target_audience' => 'nullable|string|max:255',
            'is_published' => 'boolean',
            'barangay_id' => 'nullable|exists:barangays,id',
        ]);

        $user = $request->user();

        $announcement = Announcement::create([
            'title' => $request->input('title'),
            'description' => $request->input('content'),
            'type_id' => $request->input('type_id'),
            'event_date' => $request->input('event_date'),
            'location' => $request->input('location'),
            'target_audience' => $request->input('target_audience'),
            'is_published' => $request->boolean('is_published', false),
            'published_date' => $request->boolean('is_published') ? now() : null,
            'created_by' => $user->id,
            'barangay_id' => $request->input('barangay_id'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Announcement created successfully',
            'data' => $announcement->load(['type', 'barangay', 'media']),
        ], 201);
    }

    /**
     * Update announcement.
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'title' => 'string|max:255',
            'content' => 'string',
            'type_id' => 'nullable|exists:announcement_types,id',
            'event_date' => 'nullable|date',
            'location' => 'nullable|string|max:255',
            'target_audience' => 'nullable|string|max:255',
            'is_published' => 'boolean',
            'barangay_id' => 'nullable|exists:barangays,id',
        ]);

        $announcement = Announcement::findOrFail($id);

        $updateData = $request->only([
            'title', 'type_id', 'event_date', 'location', 'target_audience', 'barangay_id'
        ]);

        if ($request->has('content')) {
            $updateData['description'] = $request->input('content');
        }

        if ($request->has('is_published')) {
            $isPublished = $request->boolean('is_published');
            $updateData['is_published'] = $isPublished;

            // Set published_date if publishing for the first time
            if ($isPublished && !$announcement->is_published) {
                $updateData['published_date'] = now();
            }
            // If un-publishing, you might want to nullify the date
            // else if (!$isPublished) {
            //     $updateData['published_date'] = null;
            // }
        }

        $announcement->update($updateData);

        return response()->json([
            'success' => true,
            'message' => 'Announcement updated successfully',
            'data' => $announcement->fresh(['type', 'barangay', 'media']),
        ]);
    }

    /**
     * Delete announcement.
     */
    public function destroy($id)
    {
        $announcement = Announcement::findOrFail($id);
        $announcement->delete();

        return response()->json([
            'success' => true,
            'message' => 'Announcement deleted successfully',
        ]);
    }

    /**
     * List media files for an announcement.
     */
    public function mediaIndex($id)
    {
        $announcement = Announcement::findOrFail($id);

        $media = $announcement->media
            ->map(function (AnnouncementMedia $media) {
                return [
                    'id' => $media->id,
                    'file_path' => $media->file_path,
                    'media_type' => $media->media_type,
                    'uploaded_at' => optional($media->uploaded_at)->toIso8601String(),
                    'url' => asset('storage/' . $media->file_path),
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $media,
        ]);
    }

    /**
     * Upload media for an announcement.
     */
    public function uploadMedia(Request $request, $id)
    {
        $announcement = Announcement::findOrFail($id);

        $request->validate([
            'file' => 'required|file|max:5120', // 5MB
        ]);

        $file = $request->file('file');
        $mime = $file->getMimeType();

        if (str_starts_with($mime, 'image/')) {
            $mediaType = 'image';
        } elseif (str_starts_with($mime, 'video/')) {
            $mediaType = 'video';
        } else {
            $mediaType = 'document';
        }

        $extension = $file->getClientOriginalExtension();
        $filename = time() . '_' . uniqid() . '.' . $extension;

        $path = $file->storeAs(
            'uploads/announcements/' . $announcement->id,
            $filename,
            'public'
        );

        $media = AnnouncementMedia::create([
            'announcement_id' => $announcement->id,
            'file_path' => $path,
            'media_type' => $mediaType,
            'uploaded_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Media uploaded successfully',
            'data' => [
                'id' => $media->id,
                'file_path' => $media->file_path,
                'media_type' => $media->media_type,
                'uploaded_at' => optional($media->uploaded_at)->toIso8601String(),
                'url' => asset('storage/' . $media->file_path),
            ],
        ], 201);
    }

    /**
     * Delete a media file.
     */
    public function destroyMedia($mediaId)
    {
        $media = AnnouncementMedia::findOrFail($mediaId);

        Storage::disk('public')->delete($media->file_path);
        $media->delete();

        return response()->json([
            'success' => true,
            'message' => 'Media deleted successfully',
        ]);
    }

    /**
     * Get announcement types for dropdown.
     */
    public function types()
    {
        $types = \App\Models\AnnouncementType::all();

        return response()->json([
            'success' => true,
            'data' => $types,
        ]);
    }
}
