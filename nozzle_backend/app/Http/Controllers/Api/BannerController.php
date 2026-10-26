<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Banner;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class BannerController extends Controller
{
    /**
     * Display a listing of active banners for the mobile app client.
     */
    public function index(): JsonResponse
    {
        $banners = Banner::where('is_active', true)
            ->orderBy('sort_order', 'asc')
            ->get()
            ->map(function ($banner) {
                $imageUrl = $banner->image_url;
                if ($imageUrl && !str_starts_with($imageUrl, 'http')) {
                    $imageUrl = rtrim(request()->getSchemeAndHttpHost(), '/') . '/' . ltrim($imageUrl, '/');
                }
                $mobileImageUrl = $banner->mobile_image_url;
                if ($mobileImageUrl && !str_starts_with($mobileImageUrl, 'http')) {
                    $mobileImageUrl = rtrim(request()->getSchemeAndHttpHost(), '/') . '/' . ltrim($mobileImageUrl, '/');
                }

                return [
                    'id' => $banner->id,
                    'title' => $banner->title,
                    'subtitle' => $banner->subtitle,
                    'image_url' => $imageUrl,
                    'mobile_image_url' => $mobileImageUrl,
                    'link_type' => $banner->link_type ?? 'none',
                    'category_id' => $banner->category_id,
                    'subcategory_id' => $banner->subcategory_id,
                    'product_id' => $banner->product_id,
                    'external_url' => $banner->external_url,
                    'text_alignment' => $banner->text_alignment ?? 'center',
                    'text_color' => $banner->text_color ?? '#ffffff',
                    'overlay_color' => $banner->overlay_color ?? '#000000',
                    'overlay_opacity' => (double)($banner->overlay_opacity ?? 0.4),
                    'button_text' => $banner->button_text,
                    'sort_order' => $banner->sort_order ?? 0,
                ];
            });

        return response()->json([
            'status' => 'success',
            'data' => $banners
        ]);
    }

    /**
     * Display all banners (including inactive ones) with CTR stats for the Admin panel.
     */
    public function indexAdmin(): JsonResponse
    {
        $banners = Banner::orderBy('sort_order', 'asc')
            ->get()
            ->map(function ($banner) {
                $imageUrl = $banner->image_url;
                if ($imageUrl && !str_starts_with($imageUrl, 'http')) {
                    $imageUrl = rtrim(request()->getSchemeAndHttpHost(), '/') . '/' . ltrim($imageUrl, '/');
                }
                $mobileImageUrl = $banner->mobile_image_url;
                if ($mobileImageUrl && !str_starts_with($mobileImageUrl, 'http')) {
                    $mobileImageUrl = rtrim(request()->getSchemeAndHttpHost(), '/') . '/' . ltrim($mobileImageUrl, '/');
                }

                $views = $banner->views ?? 0;
                $clicks = $banner->clicks ?? 0;
                $ctr = $views > 0 ? round(($clicks / $views) * 100, 2) : 0.0;

                return [
                    'id' => $banner->id,
                    'title' => $banner->title,
                    'subtitle' => $banner->subtitle,
                    'image_url' => $imageUrl,
                    'mobile_image_url' => $mobileImageUrl,
                    'link_type' => $banner->link_type ?? 'none',
                    'category_id' => $banner->category_id,
                    'subcategory_id' => $banner->subcategory_id,
                    'product_id' => $banner->product_id,
                    'external_url' => $banner->external_url,
                    'text_alignment' => $banner->text_alignment ?? 'center',
                    'text_color' => $banner->text_color ?? '#ffffff',
                    'overlay_color' => $banner->overlay_color ?? '#000000',
                    'overlay_opacity' => (double)($banner->overlay_opacity ?? 0.4),
                    'button_text' => $banner->button_text,
                    'sort_order' => $banner->sort_order ?? 0,
                    'is_active' => (bool)$banner->is_active,
                    'views' => $views,
                    'clicks' => $clicks,
                    'ctr' => $ctr,
                    'start_date' => $banner->start_date ? \Carbon\Carbon::parse($banner->start_date)->toIso8601String() : null,
                    'end_date' => $banner->end_date ? \Carbon\Carbon::parse($banner->end_date)->toIso8601String() : null,
                ];
            });

        return response()->json([
            'status' => 'success',
            'data' => $banners
        ]);
    }

    /**
     * Store a newly created banner.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string',
            'subtitle' => 'nullable|string',
            'image_url' => 'required|string',
            'mobile_image_url' => 'nullable|string',
            'link_type' => 'required|string',
            'product_id' => 'nullable|integer',
            'category_id' => 'nullable|integer',
            'external_url' => 'nullable|string',
            'text_alignment' => 'nullable|string',
            'text_color' => 'nullable|string',
            'overlay_color' => 'nullable|string',
            'overlay_opacity' => 'nullable|numeric',
            'button_text' => 'nullable|string',
            'sort_order' => 'nullable|integer',
            'start_date' => 'nullable|string',
            'end_date' => 'nullable|string',
            'is_active' => 'boolean'
        ]);

        if (isset($validated['start_date'])) {
            $validated['start_date'] = $validated['start_date'] ? \Carbon\Carbon::parse($validated['start_date']) : null;
        }
        if (isset($validated['end_date'])) {
            $validated['end_date'] = $validated['end_date'] ? \Carbon\Carbon::parse($validated['end_date']) : null;
        }

        $validated['views'] = 0;
        $validated['clicks'] = 0;
        $validated['image'] = $validated['image_url'];

        $banner = Banner::create($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Banner created successfully',
            'data' => $banner
        ]);
    }

    /**
     * Update an existing banner.
     */
    public function update(Request $request, $id): JsonResponse
    {
        $banner = Banner::find($id);
        if (!$banner) {
            return response()->json(['detail' => 'Banner not found'], 404);
        }

        $validated = $request->validate([
            'title' => 'required|string',
            'subtitle' => 'nullable|string',
            'image_url' => 'required|string',
            'mobile_image_url' => 'nullable|string',
            'link_type' => 'required|string',
            'product_id' => 'nullable|integer',
            'category_id' => 'nullable|integer',
            'external_url' => 'nullable|string',
            'text_alignment' => 'nullable|string',
            'text_color' => 'nullable|string',
            'overlay_color' => 'nullable|string',
            'overlay_opacity' => 'nullable|numeric',
            'button_text' => 'nullable|string',
            'sort_order' => 'nullable|integer',
            'start_date' => 'nullable|string',
            'end_date' => 'nullable|string',
            'is_active' => 'boolean'
        ]);

        if (isset($validated['start_date'])) {
            $validated['start_date'] = $validated['start_date'] ? \Carbon\Carbon::parse($validated['start_date']) : null;
        }
        if (isset($validated['end_date'])) {
            $validated['end_date'] = $validated['end_date'] ? \Carbon\Carbon::parse($validated['end_date']) : null;
        }

        $validated['image'] = $validated['image_url'];
        $banner->update($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Banner updated successfully',
            'data' => $banner
        ]);
    }

    /**
     * Delete a banner.
     */
    public function destroy($id): JsonResponse
    {
        $banner = Banner::find($id);
        if (!$banner) {
            return response()->json(['detail' => 'Banner not found'], 404);
        }

        $banner->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Banner deleted successfully'
        ]);
    }

    /**
     * Reorder banners sequence.
     */
    public function reorder(Request $request): JsonResponse
    {
        $items = $request->input(); // expected array of [{id: 1, sort_order: 0}, ...]
        if (is_array($items)) {
            foreach ($items as $item) {
                if (isset($item['id'])) {
                    Banner::where('id', $item['id'])->update([
                        'sort_order' => $item['sort_order'] ?? 0
                    ]);
                }
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Banners order updated successfully'
        ]);
    }
}
