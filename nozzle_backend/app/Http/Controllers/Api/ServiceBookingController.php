<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Service;
use App\Models\ServiceBooking;
use App\Models\ServiceRequestStatusHistory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class ServiceBookingController extends Controller
{
    /**
     * Create a new booking request (Public/Client).
     */
    public function store(Request $request): JsonResponse
    {
        ServiceBooking::ensureSchema();

        $validator = Validator::make($request->all(), [
            'service_id' => 'required_without:services|exists:services,id',
            'services' => 'nullable|array',
            'services.*.service_id' => 'required|exists:services,id',
            'services.*.service_option_id' => 'nullable|exists:service_options,id',
            'customer_name' => 'required|string|max:255',
            'customer_phone' => 'required|string|max:20',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'بيانات غير صالحة',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $hasUserIdCol = Schema::hasColumn('service_requests', 'user_id');
            $hasHistoryNoteCol = Schema::hasColumn('service_request_status_history', 'note');
            $hasHistoryNotesCol = Schema::hasColumn('service_request_status_history', 'notes');

            DB::beginTransaction();

            $user = auth()->user();
            if (!$user) {
                $authHeader = $request->header('Authorization');
                if ($authHeader && preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
                    $token = $matches[1];
                    try {
                        $payload = \App\Helpers\JWTHelper::decode($token);
                        if ($payload && isset($payload['sub'])) {
                            $email = $payload['sub'];
                            $user = \App\Models\User::where('email', $email)->orWhere('phone', $email)->first();
                        }
                    } catch (\Exception $e) {
                        // Ignore
                    }
                }
            }
            $userId = $user ? $user->id : null;

            $customerName = $request->customer_name;
            $customerPhone = $request->customer_phone;
            $notes = $request->notes;
            $scheduledDate = $request->input('scheduled_date');
            $scheduledTime = $request->input('scheduled_time');
            $scheduledAt = $request->input('scheduled_at');

            if ($scheduledAt) {
                try {
                    $carbon = \Carbon\Carbon::parse($scheduledAt);
                    $scheduledDate = $carbon->toDateString();
                    $scheduledTime = $carbon->toTimeString();
                } catch (\Exception $e) {
                    // Fallback
                }
            }

            if (!$scheduledDate) {
                $scheduledDate = date('Y-m-d');
            }
            if (!$scheduledTime) {
                $scheduledTime = date('H:i');
            }

            $requestNumber = 'SR-' . date('Ymd') . '-' . rand(1000, 9999);
            $bookingsCreated = [];

            if ($request->has('services') && is_array($request->services)) {
                $servicesList = $request->services;
            } else {
                $servicesList = [
                    [
                        'service_id' => $request->service_id,
                        'service_option_id' => $request->input('service_option_id') ?: $request->input('option_id'),
                        'total_price' => $request->input('total_price'),
                    ]
                ];
            }

            foreach ($servicesList as $index => $item) {
                $serviceId = $item['service_id'];
                $optionId = $item['service_option_id'] ?? null;

                $service = Service::find($serviceId);
                $basePrice = $service ? $service->base_price : 0;
                $extraPrice = 0.0;

                if ($optionId) {
                    $option = DB::table('service_options')->where('id', $optionId)->first();
                    if ($option) {
                        $extraPrice = (float)($option->extra_price ?? 0.0);
                    }
                }
                
                $itemTotalPrice = isset($item['total_price']) ? (float)$item['total_price'] : ($basePrice + $extraPrice);
                $itemRequestNumber = count($servicesList) > 1 ? ($requestNumber . '-' . ($index + 1)) : $requestNumber;

                $bookingData = [
                    'request_number' => $itemRequestNumber,
                    'service_id' => $serviceId,
                    'service_option_id' => $optionId ?: null,
                    'customer_name' => $customerName,
                    'customer_phone' => $customerPhone,
                    'address' => $request->input('address') ?: 'داخل المركز',
                    'latitude' => $request->input('latitude'),
                    'longitude' => $request->input('longitude'),
                    'scheduled_date' => $scheduledDate,
                    'scheduled_time' => $scheduledTime,
                    'notes' => $notes,
                    'status' => 'new',
                    'total_price' => $itemTotalPrice,
                    'payment_method' => $request->input('payment_method') ?: 'cash',
                    'payment_status' => $request->input('payment_status') ?: 'unpaid',
                ];

                if ($hasUserIdCol) {
                    $bookingData['user_id'] = $userId;
                }

                $booking = ServiceBooking::create($bookingData);

                // Log status history
                $historyData = [
                    'service_request_id' => $booking->id,
                    'old_status' => null,
                    'new_status' => 'new',
                    'changed_by' => 'الزبون',
                    'notify_customer' => true,
                ];
                $historyNote = $notes ?: 'تم إنشاء طلب الحجز بنجاح عبر التطبيق';
                if ($hasHistoryNoteCol) {
                    $historyData['note'] = $historyNote;
                } elseif ($hasHistoryNotesCol) {
                    $historyData['notes'] = $historyNote;
                }

                ServiceRequestStatusHistory::create($historyData);

                $bookingsCreated[] = ServiceBooking::with(['service', 'option'])->find($booking->id);
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'success' => true,
                'message' => 'تم استلام طلب الحجز بنجاح، سنتواصل معك قريباً',
                'data' => count($bookingsCreated) === 1 ? $bookingsCreated[0] : $bookingsCreated
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status' => 'error',
                'message' => 'فشل إنشاء الحجز: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display service requests for user by phone or authenticated user (Client).
     */
    public function index(Request $request): JsonResponse
    {
        ServiceBooking::ensureSchema();
        $hasUserIdCol = Schema::hasColumn('service_requests', 'user_id');

        $phone = $request->query('phone');
        $user = auth()->user();
        if (!$user) {
            $authHeader = $request->header('Authorization');
            if ($authHeader && preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
                $token = $matches[1];
                try {
                    $payload = \App\Helpers\JWTHelper::decode($token);
                    if ($payload && isset($payload['sub'])) {
                        $email = $payload['sub'];
                        $user = \App\Models\User::where('email', $email)->orWhere('phone', $email)->first();
                    }
                } catch (\Exception $e) {
                    // Ignore decoding errors
                }
            }
        }
        $bookings = collect();

        if ($user) {
            if ($user->is_admin) {
                if ($phone) {
                    $bookings = ServiceBooking::where('customer_phone', $phone)
                        ->with(['service', 'option'])
                        ->orderBy('created_at', 'desc')
                        ->get();
                } else {
                    $bookings = ServiceBooking::with(['service', 'option'])
                        ->orderBy('created_at', 'desc')
                        ->get();
                }
            } else {
                $userPhone = $user->phone ?: '';
                $query = ServiceBooking::where('customer_phone', $userPhone);
                if ($hasUserIdCol) {
                    $query->orWhere('user_id', $user->id);
                }
                $bookings = $query
                    ->with(['service', 'option'])
                    ->orderBy('created_at', 'desc')
                    ->get();
            }
        } elseif ($phone) {
            $bookings = ServiceBooking::where('customer_phone', $phone)
                ->with(['service', 'option'])
                ->orderBy('created_at', 'desc')
                ->get();
        } else {
            return response()->json([
                'status' => 'error',
                'message' => 'الرجاء تسجيل الدخول أو توفير رقم الهاتف'
            ], 400);
        }

        return response()->json([
            'status' => 'success',
            'success' => true,
            'data' => $bookings
        ]);
    }

    /**
     * Fetch user bookings (Client).
     */
    public function userBookings(): JsonResponse
    {
        ServiceBooking::ensureSchema();
        $user = auth()->user();
        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'غير مصرح بالدخول'
            ], 401);
        }

        $hasUserIdCol = Schema::hasColumn('service_requests', 'user_id');
        $query = ServiceBooking::query();
        if ($hasUserIdCol) {
            $query->where(function ($q) use ($user) {
                $q->where('user_id', $user->id);
                if ($user->phone) {
                    $q->orWhere('customer_phone', $user->phone);
                }
            });
        } else {
            $query->where('customer_phone', $user->phone ?: '');
        }

        $bookings = $query
            ->with(['service', 'option'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $bookings
        ]);
    }

    /**
     * Listing of all service requests with filters (Admin).
     */
    public function indexAdmin(Request $request): JsonResponse
    {
        $query = ServiceBooking::with(['service', 'option']);

        // Apply filters
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->has('service_id') && $request->service_id !== 'all') {
            $query->where('service_id', $request->service_id);
        }

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('customer_name', 'like', "%{$search}%")
                  ->orWhere('customer_phone', 'like', "%{$search}%")
                  ->orWhere('request_number', 'like', "%{$search}%");
            });
        }

        if ($request->has('date_from') && $request->date_from) {
            $query->where('scheduled_date', '>=', $request->date_from);
        }

        if ($request->has('date_to') && $request->date_to) {
            $query->where('scheduled_date', '<=', $request->date_to);
        }

        $bookings = $query->orderBy('created_at', 'desc')->get();

        // Calculate status stats
        $stats = [
            'all' => ServiceBooking::count(),
            'new' => ServiceBooking::where('status', 'new')->count(),
            'confirmed' => ServiceBooking::where('status', 'confirmed')->count(),
            'in_progress' => ServiceBooking::where('status', 'in_progress')->count(),
            'completed' => ServiceBooking::where('status', 'completed')->count(),
            'cancelled' => ServiceBooking::where('status', 'cancelled')->count(),
        ];

        return response()->json([
            'status' => 'success',
            'data' => $bookings,
            'meta' => [
                'stats' => $stats
            ]
        ]);
    }

    /**
     * Show details of a specific service request (Admin).
     */
    public function showAdmin($id): JsonResponse
    {
        $booking = ServiceBooking::with(['service', 'option', 'status_history' => function ($q) {
            $q->orderBy('created_at', 'desc');
        }])->find($id);

        if (!$booking) {
            return response()->json([
                'status' => 'error',
                'message' => 'الحجز غير موجود'
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $booking
        ]);
    }

    /**
     * Update status and details of a booking request (Admin).
     */
    public function updateStatus(Request $request, $id): JsonResponse
    {
        $booking = ServiceBooking::find($id);

        if (!$booking) {
            return response()->json([
                'status' => 'error',
                'message' => 'الحجز غير موجود'
            ], 404);
        }

        $request->validate([
            'status' => 'required|string|in:new,confirmed,in_progress,completed,cancelled',
        ]);

        try {
            DB::beginTransaction();

            $oldStatus = $booking->status;
            $newStatus = $request->status;

            // Prepare update data
            $updateData = ['status' => $newStatus];
            if ($request->has('assigned_worker')) {
                $updateData['assigned_worker'] = $request->assigned_worker;
            }
            if ($request->has('worker_phone')) {
                $updateData['worker_phone'] = $request->worker_phone;
            }
            
            // If the note content is a direct internal note save
            if ($request->has('note') && str_contains($request->note, '[ملاحظة داخلية]')) {
                $updateData['admin_notes'] = str_replace('[ملاحظة داخلية]: ', '', $request->note);
            }

            $booking->update($updateData);

            // Determine author
            $changer = auth()->user() ? (auth()->user()->name ?: auth()->user()->email) : 'مشرف';

            // Create timeline log
            ServiceRequestStatusHistory::create([
                'service_request_id' => $booking->id,
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
                'changed_by' => $changer,
                'note' => $request->note ?: 'تم تحديث حالة الطلب',
                'notify_customer' => $request->boolean('notify_customer', true),
            ]);

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'تم تحديث حالة الحجز بنجاح'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status' => 'error',
                'message' => 'فشل تحديث حالة الحجز: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get print data for service request (Admin).
     */
    public function printData($id): JsonResponse
    {
        $booking = ServiceBooking::with(['service', 'option'])->find($id);

        if (!$booking) {
            return response()->json([
                'status' => 'error',
                'message' => 'الحجز غير موجود'
            ], 404);
        }

        // Get settings
        $settingsController = new SettingsController();
        $settingsResponse = $settingsController->index();
        $settings = $settingsResponse->getData(true);

        $printData = [
            'request_number' => $booking->request_number,
            'created_at' => $booking->created_at,
            'status' => $booking->status,
            'customer_name' => $booking->customer_name,
            'customer_phone' => $booking->customer_phone,
            'address' => $booking->address,
            'service_name' => $booking->service ? $booking->service->name : 'خدمة غير معروفة',
            'scheduled_date' => $booking->scheduled_date,
            'scheduled_time' => $booking->scheduled_time,
            'option_name' => $booking->option ? $booking->option->name : null,
            'duration_minutes' => ($booking->service ? $booking->service->duration_minutes : 60) + ($booking->option ? $booking->option->duration_extra_minutes : 0),
            'assigned_worker' => $booking->assigned_worker,
            'worker_phone' => $booking->worker_phone,
            'base_price' => $booking->service ? $booking->service->base_price : 0,
            'option_price' => $booking->option ? $booking->option->extra_price : 0,
            'total_price' => $booking->total_price,
            'payment_method' => $booking->payment_method,
            'payment_status' => $booking->payment_status,
            'notes' => $booking->notes,
            'settings' => $settings
        ];

        return response()->json([
            'status' => 'success',
            'data' => $printData
        ]);
    }
}
