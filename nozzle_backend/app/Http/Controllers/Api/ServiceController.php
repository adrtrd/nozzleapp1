<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Service;
use App\Models\ServiceOption;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ServiceController extends Controller
{
    /**
     * Display a listing of all available services (Public).
     */
    public function index(): JsonResponse
    {
        $services = Service::whereIn('is_available', [1, true, '1'])
            ->orderBy('sort_order')
            ->get();

        $formatted = [];
        foreach ($services as $s) {
            $imageUrl = $s->image_url;
            if ($imageUrl && !str_starts_with($imageUrl, 'http')) {
                $imageUrl = rtrim(request()->getSchemeAndHttpHost(), '/') . '/' . ltrim($imageUrl, '/');
            }

            $formatted[] = [
                'id' => $s->id,
                'title' => $s->name,
                'title_ar' => $s->name,
                'description' => $s->description,
                'description_ar' => $s->description,
                'icon' => 'build',
                'image' => $imageUrl,
                'price' => (float)$s->base_price,
                'duration_minutes' => (int)$s->duration_minutes,
                'is_active' => (bool)$s->is_available
            ];
        }

        return response()->json([
            'status' => 'success',
            'data' => $formatted
        ]);
    }

    /**
     * Display a listing of all available services (Public V1 / raw structure).
     */
    public function indexV1(): JsonResponse
    {
        $services = Service::where('is_available', true)
            ->orderBy('sort_order')
            ->with('options')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $services
        ]);
    }

    /**
     * Display a listing of all services for Admin.
     */
    public function indexAdmin(): JsonResponse
    {
        $services = Service::orderBy('sort_order')
            ->with('options')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $services
        ]);
    }

    /**
     * Display the specified service (Public).
     */
    public function show($id): JsonResponse
    {
        $service = Service::with('options')->find($id);

        if (!$service) {
            return response()->json([
                'status' => 'error',
                'message' => 'الخدمة غير موجودة'
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $service
        ]);
    }

    /**
     * Store a newly created service in storage (Admin).
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'short_description' => 'required|string|max:500',
            'description' => 'required|string',
            'base_price' => 'required|numeric',
        ]);

        try {
            DB::beginTransaction();

            $service = Service::create([
                'name' => $request->name,
                'description' => $request->description,
                'short_description' => $request->short_description,
                'image_url' => $request->image_url,
                'gallery_urls' => $request->gallery_urls ?: [],
                'icon_emoji' => $request->icon_emoji ?: '🛠️',
                'base_price' => $request->base_price,
                'price_type' => $request->price_type ?: 'fixed',
                'category' => $request->category ?: 'تنظيف',
                'tags' => $request->tags ?: [],
                'duration_minutes' => $request->duration_minutes ?: 60,
                'is_available' => $request->boolean('is_available', true),
                'is_featured' => $request->boolean('is_featured', false),
                'sort_order' => $request->sort_order ?: 0,
                'working_hours' => $request->working_hours ?: [],
                'max_bookings_per_day' => $request->max_bookings_per_day ?: 10,
                'advance_booking_days' => $request->advance_booking_days ?: 30,
                'rating' => 5.0,
                'reviews_count' => 0,
                'total_bookings' => 0,
            ]);

            // Save options
            if ($request->has('options')) {
                foreach ($request->options as $optData) {
                    ServiceOption::create([
                        'service_id' => $service->id,
                        'name' => $optData['name'],
                        'description' => $optData['description'] ?? '',
                        'extra_price' => $optData['extra_price'] ?? 0.0,
                        'duration_extra_minutes' => $optData['duration_extra_minutes'] ?? 0,
                        'sort_order' => $optData['sort_order'] ?? 0,
                        'is_active' => $optData['is_active'] ?? true,
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'تم إنشاء الخدمة بنجاح',
                'data' => Service::with('options')->find($service->id)
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status' => 'error',
                'message' => 'فشل إنشاء الخدمة: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update the specified service in storage (Admin).
     */
    public function update(Request $request, $id): JsonResponse
    {
        $service = Service::find($id);

        if (!$service) {
            return response()->json([
                'status' => 'error',
                'message' => 'الخدمة غير موجودة'
            ], 404);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'short_description' => 'required|string|max:500',
            'description' => 'required|string',
            'base_price' => 'required|numeric',
        ]);

        try {
            DB::beginTransaction();

            $service->update([
                'name' => $request->name,
                'description' => $request->description,
                'short_description' => $request->short_description,
                'image_url' => $request->image_url,
                'gallery_urls' => $request->gallery_urls ?: [],
                'icon_emoji' => $request->icon_emoji ?: '🛠️',
                'base_price' => $request->base_price,
                'price_type' => $request->price_type ?: 'fixed',
                'category' => $request->category ?: 'تنظيف',
                'tags' => $request->tags ?: [],
                'duration_minutes' => $request->duration_minutes ?: 60,
                'is_available' => $request->boolean('is_available', true),
                'is_featured' => $request->boolean('is_featured', false),
                'sort_order' => $request->sort_order ?: 0,
                'working_hours' => $request->working_hours ?: [],
                'max_bookings_per_day' => $request->max_bookings_per_day ?: 10,
                'advance_booking_days' => $request->advance_booking_days ?: 30,
            ]);

            // Sync options
            if ($request->has('options')) {
                // Delete old ones and write new ones to be safe and simple
                ServiceOption::where('service_id', $service->id)->delete();
                foreach ($request->options as $optData) {
                    ServiceOption::create([
                        'service_id' => $service->id,
                        'name' => $optData['name'],
                        'description' => $optData['description'] ?? '',
                        'extra_price' => $optData['extra_price'] ?? 0.0,
                        'duration_extra_minutes' => $optData['duration_extra_minutes'] ?? 0,
                        'sort_order' => $optData['sort_order'] ?? 0,
                        'is_active' => $optData['is_active'] ?? true,
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'تم تحديث الخدمة بنجاح',
                'data' => Service::with('options')->find($service->id)
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status' => 'error',
                'message' => 'فشل تحديث الخدمة: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete the specified service (Admin).
     */
    public function destroy($id): JsonResponse
    {
        $service = Service::find($id);

        if (!$service) {
            return response()->json([
                'status' => 'error',
                'message' => 'الخدمة غير موجودة'
            ], 404);
        }

        try {
            DB::beginTransaction();
            ServiceOption::where('service_id', $service->id)->delete();
            $service->delete();
            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'تم حذف الخدمة بنجاح'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status' => 'error',
                'message' => 'فشل حذف الخدمة: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reorder services (Admin).
     */
    public function reorder(Request $request): JsonResponse
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'required|integer',
        ]);

        try {
            DB::beginTransaction();
            foreach ($request->ids as $index => $id) {
                Service::where('id', $id)->update(['sort_order' => $index]);
            }
            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'تم إعادة ترتيب الخدمات بنجاح'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status' => 'error',
                'message' => 'فشل إعادة ترتيب الخدمات: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get unique list of categories (Admin).
     */
    public function categories(): JsonResponse
    {
        $dbCats = Service::distinct()->pluck('category')->filter()->toArray();
        $defaultCats = ['تنظيف', 'صيانة', 'توصيل', 'تلميع'];
        $categories = array_values(array_unique(array_merge($defaultCats, $dbCats)));

        return response()->json([
            'status' => 'success',
            'data' => $categories
        ]);
    }

    /**
     * Get statistics for services and bookings (Admin).
     */
    public function stats(): JsonResponse
    {
        $totalServices = Service::count();
        $activeServices = Service::where('is_available', true)->count();
        $totalRequests = \App\Models\ServiceBooking::count();

        // Today requests
        $todayRequests = \App\Models\ServiceBooking::where('created_at', '>=', \Carbon\Carbon::today()->toDateTimeString())->count();

        $pendingRequests = \App\Models\ServiceBooking::where('status', 'new')->count();

        // This month revenue
        $thisMonthRevenue = \App\Models\ServiceBooking::where('status', 'completed')
            ->where('completed_at', '>=', \Carbon\Carbon::now()->startOfMonth()->toDateTimeString())
            ->sum('total_price');

        // Status distribution
        $statuses = ["new", "confirmed", "in_progress", "completed", "cancelled"];
        $requestsByStatus = [];
        foreach ($statuses as $st) {
            $requestsByStatus[$st] = \App\Models\ServiceBooking::where('status', $st)->count();
        }

        // Top services
        $topServicesQuery = \App\Models\ServiceBooking::select('service_id', DB::raw('count(id) as count'))
            ->groupBy('service_id')
            ->orderBy('count', 'desc')
            ->limit(5)
            ->get();

        $topServices = [];
        foreach ($topServicesQuery as $item) {
            $s = Service::find($item->service_id);
            if ($s) {
                $topServices[] = [
                    'name' => $s->name,
                    'count' => $item->count
                ];
            }
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'total_services' => $totalServices,
                'active_services' => $activeServices,
                'total_requests' => $totalRequests,
                'today_requests' => $todayRequests,
                'pending_requests' => $pendingRequests,
                'this_month_revenue' => (float)$thisMonthRevenue,
                'requests_by_status' => $requestsByStatus,
                'top_services' => $topServices
            ]
        ]);
    }
}
