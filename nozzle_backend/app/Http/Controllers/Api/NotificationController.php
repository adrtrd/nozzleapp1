<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminNotification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * List all admin/push notifications (most recent first).
     */
    public function index()
    {
        return response()->json(
            AdminNotification::orderBy('created_at', 'desc')->get()
        );
    }

    /**
     * Create (send or schedule) a notification.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'body' => 'required|string',
            'image_url' => 'nullable|string|max:1000',
            'target_type' => 'nullable|string|max:50',
            'target_id' => 'nullable|string|max:255',
            'status' => 'nullable|string|max:50',
            'scheduled_at' => 'nullable|date',
        ]);

        $notification = AdminNotification::create([
            'title' => $validated['title'],
            'body' => $validated['body'],
            'image_url' => $validated['image_url'] ?? null,
            'target_type' => $validated['target_type'] ?? 'all',
            'target_id' => $validated['target_id'] ?? null,
            'status' => $validated['status'] ?? 'sent',
            'scheduled_at' => $validated['scheduled_at'] ?? null,
        ]);

        return response()->json($notification, 201);
    }

    /**
     * Delete a notification record.
     */
    public function destroy($id)
    {
        $notification = AdminNotification::find($id);

        if (!$notification) {
            return response()->json(['detail' => 'الإشعار غير موجود'], 404);
        }

        $notification->delete();

        return response()->json(['message' => 'تم حذف الإشعار بنجاح']);
    }
}
