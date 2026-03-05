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
    public function index(Request $request)
    {
        $user = $request->user();
        $perPage = $request->get('per_page', 15);
        $query = Announcement::with(['type', 'barangay', 'createdBy']);

        if (!$user->isMainAdmin()) {
            $barangayIds = $user->getAccessibleBarangayIds();
            $query->where(function ($q) use ($barangayIds) {
                $q->whereNull('barangay_id')->orWhereIn('barangay_id', $barangayIds);
            });
        }

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
            'title' => 'required|string|max:255',
            'content' => 'required|string', // FIXED BUG 3
            'type_id' => 'required|exists:announcement_types,id',
            'is_published' => 'boolean',
        ]);

        $announcement = Announcement::create([
            'title' => $request->input('title'),
            'description' => $request->input('content'), // Map 'content' to 'description'
            'type_id' => $request->input('type_id'),
            'event_date' => $request->input('event_date'),
            'location' => $request->input('location'),
            'target_audience' => $request->input('target_audience'),
            'is_published' => $request->boolean('is_published', false),
            'published_date' => $request->boolean('is_published') ? now() : null,
            'created_by' => $request->user()->id,
        ]);

        return response()->json(['success' => true, 'data' => $announcement], 201);
    }

    public function update(Request $request, $id)
    {
        $announcement = Announcement::findOrFail($id);
        $updateData = $request->only(['title', 'type_id', 'event_date', 'location', 'target_audience']);

        if ($request->has('content')) {
            $updateData['description'] = $request->input('content'); // Map 'content' to 'description'
        }

        if ($request->has('is_published')) {
            $isPublished = $request->boolean('is_published');
            $updateData['is_published'] = $isPublished;
            if ($isPublished && !$announcement->is_published) {
                $updateData['published_date'] = now();
            }
        }

        // Detect publish action
        if (isset($updateData['is_published']) && $updateData['is_published'] && !$announcement->getOriginal('is_published')) {
            $actionKey = 'announcement_publish';
            $desc = "Announcement published: {$announcement->title}";
        } else {
            $actionKey = 'announcement_update';
            $desc = "Announcement updated: {$announcement->title}";
        }

        $announcement->update($updateData);

        return response()->json(['success' => true, 'data' => $announcement->fresh(['type', 'media'])]);
    }

    public function uploadMedia(Request $request, $id)
    {
        $request->validate(['file' => 'required|file|max:20480']);
        $file = $request->file('file');
        
        $path = $file->store('announcements/' . $id, 'public');
        
        $media = AnnouncementMedia::create([
            'announcement_id' => $id,
            'file_path' => $path,
            'media_type' => str_starts_with($file->getMimeType(), 'image/') ? 'image' : 'document',
        ]);

        return response()->json([
            'success' => true, 
            'data' => array_merge($media->toArray(), ['url' => asset('storage/' . $path)])
        ]);
    }

    public function destroy($id)
    {
        Announcement::findOrFail($id)->delete();
        return response()->json(['success' => true]);
    }

    public function mediaIndex($id)
    {
        $media = AnnouncementMedia::where('announcement_id', $id)->get()->map(function($m) {
            return array_merge($m->toArray(), ['url' => asset('storage/' . $m->file_path)]);
        });
        return response()->json(['success' => true, 'data' => $media]);
    }

    public function destroyMedia($id)
    {
        $media = AnnouncementMedia::findOrFail($id);
        Storage::disk('public')->delete($media->file_path);
        $media->delete();
        return response()->json(['success' => true]);
    }

    public function types()
    {
        return response()->json(['success' => true, 'data' => AnnouncementType::all()]);
    }
}