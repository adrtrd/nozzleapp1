<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;

class UploadController extends Controller
{
    /**
     * Upload a file and return the URL.
     */
    public function uploadFile(Request $request)
    {
        if (!$request->hasFile('file')) {
            return response()->json(['detail' => 'No file provided'], 400);
        }

        $file = $request->file('file');
        
        $uploadDir = public_path('static/uploads');
        if (!File::exists($uploadDir)) {
            File::makeDirectory($uploadDir, 0755, true);
        }

        $ext = strtolower($file->getClientOriginalExtension() ?: 'jpg');
        $cleanBase = preg_replace('/[^a-zA-Z0-9_-]/', '', pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME));
        if (empty($cleanBase)) {
            $cleanBase = 'upload_' . substr(md5(uniqid('', true)), 0, 6);
        }
        $filename = time() . '_' . $cleanBase . '.' . $ext;
        
        $file->move($uploadDir, $filename);

        $baseUrl = rtrim($request->getSchemeAndHttpHost(), '/');
        $url = $baseUrl . '/static/uploads/' . $filename;

        return response()->json(['url' => $url]);
    }

    /**
     * Upload an image with folder/config options.
     */
    public function uploadImage(Request $request)
    {
        if (!$request->hasFile('file')) {
            return response()->json(['detail' => 'No file provided'], 400);
        }

        $file = $request->file('file');
        
        // Validate MIME type
        $allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];
        if (!in_array($file->getMimeType(), $allowedTypes)) {
            return response()->json(['detail' => 'نوع الملف غير مدعوم. المسموح: JPG, PNG, WebP, SVG'], 400);
        }

        $fileSizeKb = $file->getSize() / 1024;

        $uploadDir = public_path('static/uploads');
        if (!File::exists($uploadDir)) {
            File::makeDirectory($uploadDir, 0755, true);
        }

        $ext = strtolower($file->getClientOriginalExtension() ?: 'jpg');
        $cleanBase = preg_replace('/[^a-zA-Z0-9_-]/', '', pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME));
        if (empty($cleanBase)) {
            $cleanBase = 'img_' . substr(md5(uniqid('', true)), 0, 6);
        }
        $filename = time() . '_' . $cleanBase . '.' . $ext;
        
        $file->move($uploadDir, $filename);

        $baseUrl = rtrim($request->getSchemeAndHttpHost(), '/');
        $url = $baseUrl . '/static/uploads/' . $filename;

        return response()->json([
            'success' => true,
            'data' => [
                'url' => $url,
                'publicId' => $filename,
                'width' => 800,
                'height' => 800,
                'sizeKB' => (int)$fileSizeKb,
                'format' => $file->getClientOriginalExtension() ?: 'jpg'
            ]
        ]);
    }

    /**
     * Delete an uploaded image.
     */
    public function deleteImage(Request $request, $publicId)
    {
        // Safe filename extraction
        $safeFilename = basename($publicId);
        $filePath = public_path('static/uploads/' . $safeFilename);

        if (File::exists($filePath)) {
            File::delete($filePath);
            return response()->json(['success' => true, 'message' => 'تم حذف الصورة محلياً بنجاح']);
        }

        return response()->json(['success' => true, 'message' => 'لم يتم العثور على الملف لحذفه']);
    }
}
