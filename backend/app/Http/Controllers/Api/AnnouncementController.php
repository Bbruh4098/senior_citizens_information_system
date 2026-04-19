<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\AnnouncementMedia;
use App\Models\AnnouncementType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AnnouncementController extends Controller
{
    private function publicStorageUrl(Request $request, string $path): string
    {
        return Storage::disk(config('filesystems.upload_disk'))->url($path);
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $perPage = $request->get('per_page', 10);
        $query = Announcement::with(['type', 'barangay', 'createdBy']);
        $query->where('created_by', $user->id);

        if ($request->has('is_published')) {
            $query->where('is_published', $request->boolean('is_published'));
        }

        if ($search = $request->get('search')) {
            $query->where('title', 'like', "%{$search}%");
        }

        return response()->json([
            'success' => true,
            'data' => $query->orderBy('created_at', 'desc')->paginate($perPage),
        ]);
    }

    public function store(Request $request)
    {
        $isPublished = $request->boolean('is_published');

        $request->validate([
            'title' => $isPublished ? 'required|string|max:255' : 'nullable|string|max:255',
            'content' => $isPublished ? 'required|string' : 'nullable|string',
            'type_id' => $isPublished ? 'required|exists:announcement_types,id' : 'nullable|exists:announcement_types,id',
            'is_published' => 'boolean',
        ]);

        // Default type_id if none provided for draft
        $typeId = $request->input('type_id');
        if (!$typeId && !$isPublished) {
            $defaultType = AnnouncementType::first();
            $typeId = $defaultType ? $defaultType->id : 1;
        }

        $announcement = Announcement::create([
            'title' => $request->input('title') ?: 'Untitled Draft',
            'description' => $request->input('content') ?: '', 
            'type_id' => $typeId,
            'event_date' => $request->input('event_date'),
            'location' => $request->input('location'),
            'target_audience' => $request->input('target_audience'),
            'is_published' => $isPublished,
            'published_date' => $isPublished ? now() : null,
            'created_by' => $request->user()->id,
        ]);

        return response()->json(['success' => true, 'data' => $announcement], 201);
    }

    public function update(Request $request, $id)
    {
        $announcement = Announcement::findOrFail($id);
        
        $isPublished = $request->has('is_published') ? $request->boolean('is_published') : $announcement->is_published;

        $request->validate([
            'title' => $isPublished ? 'required|string|max:255' : 'nullable|string|max:255',
            'content' => $isPublished ? 'required|string' : 'nullable|string',
            'type_id' => $isPublished ? 'required|exists:announcement_types,id' : 'nullable|exists:announcement_types,id',
            'is_published' => 'boolean',
        ]);

        $updateData = $request->only(['event_date', 'location', 'target_audience']);
        
        if ($request->has('title')) {
            $updateData['title'] = $request->input('title') ?: 'Untitled Draft';
        }
        if ($request->has('type_id')) {
            $typeId = $request->input('type_id');
            if (!$typeId && !$isPublished) {
                $typeId = $announcement->type_id ?: (AnnouncementType::first()->id ?? 1);
            }
            $updateData['type_id'] = $typeId;
        }

        if ($request->has('content')) {
            $updateData['description'] = $request->input('content') ?: ''; // Map 'content' to 'description'
        }

        if ($request->has('is_published')) {
            $updateData['is_published'] = $isPublished;
            if ($isPublished && !$announcement->is_published) {
                $updateData['published_date'] = now();
            }
        }

        $announcement->update($updateData);

        return response()->json(['success' => true, 'data' => $announcement->fresh(['type', 'media'])]);
    }

    public function uploadMedia(Request $request, $id)
    {
        // 1. Ensure the announcement actually exists before uploading files
        $announcement = Announcement::findOrFail($id);
        
        // 2. Authorize the action (Example)
        // $this->authorize('update', $announcement);

        $request->validate(['file' => 'required|file|max:20480']);
        $file = $request->file('file');
        
        $path = $file->store('announcements/' . $announcement->id, config('filesystems.upload_disk'));
        
        $media = AnnouncementMedia::create([
            'announcement_id' => $announcement->id,
            'file_path' => $path,
            'media_type' => str_starts_with($file->getMimeType(), 'image/') ? 'image' : 'document',
        ]);

        return response()->json([
            'success' => true, 
            'data' => array_merge($media->toArray(), ['url' => $this->publicStorageUrl($request, $path)])
        ]);
    }

    public function destroy($id)
    {
        $announcement = Announcement::with('media')->findOrFail($id);
        
        // 1. Authorize the action (Example)
        // $this->authorize('delete', $announcement);

        // 2. Prevent storage leaks by deleting associated files first
        if ($announcement->media) {
            foreach ($announcement->media as $media) {
                Storage::disk(config('filesystems.upload_disk'))->delete($media->file_path);
            }
            // Optionally, delete the empty directory
            Storage::disk(config('filesystems.upload_disk'))->deleteDirectory('announcements/' . $announcement->id);
        }

        $announcement->delete();
        
        return response()->json(['success' => true]);
    }

    public function mediaIndex(Request $request, $id)
    {
        $media = AnnouncementMedia::where('announcement_id', $id)->get()->map(function($m) use ($request) {
            return array_merge($m->toArray(), ['url' => $this->publicStorageUrl($request, $m->file_path)]);
        });
        return response()->json(['success' => true, 'data' => $media]);
    }

    public function destroyMedia($id)
    {
        $media = AnnouncementMedia::findOrFail($id);
        Storage::disk(config('filesystems.upload_disk'))->delete($media->file_path);
        $media->delete();
        return response()->json(['success' => true]);
    }

    public function types()
    {
        return response()->json(['success' => true, 'data' => AnnouncementType::all()]);
    }
}
