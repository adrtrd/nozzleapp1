<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Order;
use App\Models\ServiceBooking;
use App\Models\Favorite;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class UserController extends Controller
{
    /**
     * Get user listing for admin.
     */
    public function index(Request $request): JsonResponse
    {
        $search = $request->query('search');
        $query = User::whereIn('role', ['customer', 'user']);

        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('full_name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $users = $query->latest('id')->get();

        $formatted = [];
        foreach ($users as $u) {
            // Count orders (excluding cancelled)
            $totalOrders = Order::where('user_id', $u->id)
                ->where('status', '!=', 'cancelled')
                ->count();

            // Sum completed order amounts
            $totalSpent = Order::where('user_id', $u->id)
                ->where('status', 'completed')
                ->sum('total_amount');

            // Format user
            $formatted[] = [
                'id' => $u->id,
                'name' => $u->name ?: $u->full_name ?: 'عميل',
                'full_name' => $u->full_name ?: $u->name ?: '',
                'phone' => $u->phone ?: '',
                'total_orders' => $totalOrders,
                'total_spent' => (float)$totalSpent,
                'created_at' => $u->created_at ? \Carbon\Carbon::parse($u->created_at)->toIso8601String() : null,
                'last_login_at' => $u->last_login_at ? \Carbon\Carbon::parse($u->last_login_at)->toIso8601String() : null,
            ];
        }

        return response()->json([
            'success' => true,
            'data' => $formatted,
        ]);
    }

    /**
     * Get user details for admin.
     */
    public function show($id): JsonResponse
    {
        $user = User::find($id);
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'المستخدم غير موجود',
            ], 404);
        }

        // Compute stats
        $ordersCount = Order::where('user_id', $user->id)->count();
        $completedOrders = Order::where('user_id', $user->id)->where('status', 'completed')->count();
        $cancelledOrders = Order::where('user_id', $user->id)->where('status', 'cancelled')->count();
        
        $serviceRequestsCount = ServiceBooking::where('user_id', $user->id)->count();
        $favoritesCount = Favorite::where('user_id', $user->id)->count();

        // Coupons used from user_coupon_usage
        $couponsUsedCount = DB::table('user_coupon_usage')->where('user_id', $user->id)->count();
        $totalSavings = DB::table('user_coupon_usage')->where('user_id', $user->id)->sum('discount_amount') ?: 0.0;
        $totalSpent = Order::where('user_id', $user->id)->where('status', 'completed')->sum('total_amount') ?: 0.0;

        $stats = [
            'orders_count' => $ordersCount,
            'completed_orders' => $completedOrders,
            'cancelled_orders' => $cancelledOrders,
            'service_requests_count' => $serviceRequestsCount,
            'favorites_count' => $favoritesCount,
            'coupons_used_count' => $couponsUsedCount,
            'total_savings' => (float)$totalSavings,
            'total_spent' => (float)$totalSpent,
        ];

        // Fetch recent orders
        $recentOrdersRaw = Order::where('user_id', $user->id)->latest('created_at')->limit(5)->get();
        $recentOrders = [];
        foreach ($recentOrdersRaw as $order) {
            $itemsCount = DB::table('order_items')->where('order_id', $order->id)->count();
            $recentOrders[] = [
                'id' => $order->id,
                'order_number' => $order->order_number ?: ('INV-' . str_pad($order->id, 6, '0', STR_PAD_LEFT)),
                'status' => $order->status ?: 'pending',
                'total' => (float)$order->total_amount,
                'items_count' => $itemsCount,
                'created_at' => $order->created_at ? \Carbon\Carbon::parse($order->created_at)->toIso8601String() : null,
            ];
        }

        // Fetch recent service requests
        $recentSRRaw = ServiceBooking::with('service')->where('user_id', $user->id)->latest('created_at')->limit(5)->get();
        $recentServiceRequests = [];
        foreach ($recentSRRaw as $sr) {
            $recentServiceRequests[] = [
                'id' => $sr->id,
                'request_number' => $sr->request_number,
                'service_name' => $sr->service ? $sr->service->name : 'خدمة غير معروفة',
                'service_image' => $sr->service ? $sr->service->image_url : null,
                'scheduled_at' => $sr->scheduled_date . ' ' . $sr->scheduled_time,
                'status' => $sr->status,
                'total_price' => (float)$sr->total_price,
                'created_at' => $sr->created_at ? \Carbon\Carbon::parse($sr->created_at)->toIso8601String() : null,
            ];
        }

        // Fetch coupons used history
        $usages = DB::table('user_coupon_usage')->where('user_id', $user->id)->latest('used_at')->get();
        $couponsUsed = [];
        foreach ($usages as $usage) {
            $orderNum = null;
            if ($usage->order_id) {
                $order = Order::find($usage->order_id);
                if ($order) {
                    $orderNum = $order->order_number ?: ('INV-' . str_pad($order->id, 6, '0', STR_PAD_LEFT));
                }
            }
            $couponsUsed[] = [
                'coupon_code' => $usage->coupon_code,
                'discount_amount' => (float)$usage->discount_amount,
                'order_number' => $orderNum,
                'used_at' => $usage->used_at ? \Carbon\Carbon::parse($usage->used_at)->toIso8601String() : null,
            ];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $user->id,
                'name' => $user->name ?: $user->full_name ?: 'عميل',
                'full_name' => $user->full_name ?: $user->name ?: '',
                'phone' => $user->phone ?: '',
                'avatar_url' => $user->avatar_url,
                'total_orders' => $ordersCount,
                'total_spent' => (float)$totalSpent,
                'created_at' => $user->created_at ? \Carbon\Carbon::parse($user->created_at)->toIso8601String() : null,
                'last_login_at' => $user->last_login_at ? \Carbon\Carbon::parse($user->last_login_at)->toIso8601String() : null,
                'stats' => $stats,
                'recent_orders' => $recentOrders,
                'recent_service_requests' => $recentServiceRequests,
                'coupons_used' => $couponsUsed,
                'favorites_count' => $favoritesCount,
            ]
        ]);
    }

    /**
     * Delete user account.
     */
    public function destroy($id): JsonResponse
    {
        $user = User::find($id);
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'المستخدم غير موجود',
            ], 404);
        }

        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'تم حذف حساب المستخدم بنجاح',
        ]);
    }

    /**
     * Get system admins listing.
     */
    public function indexAdmins(Request $request): JsonResponse
    {
        $users = User::whereIn('role', ['superadmin', 'admin'])
            ->latest('id')
            ->get();

        $formatted = [];
        foreach ($users as $u) {
            $formatted[] = [
                'id' => $u->id,
                'email' => $u->email,
                'phone' => $u->phone,
                'full_name' => $u->full_name ?: $u->name ?: 'مشرف',
                'name' => $u->name ?: $u->full_name ?: '',
                'role' => $u->role,
                'is_active' => (bool)$u->is_active,
                'avatar_url' => $u->avatar_url,
                'created_at' => $u->created_at ? \Carbon\Carbon::parse($u->created_at)->toIso8601String() : null,
                'updated_at' => $u->updated_at ? \Carbon\Carbon::parse($u->updated_at)->toIso8601String() : null,
            ];
        }

        return response()->json($formatted);
    }

    /**
     * Store a new system admin.
     */
    public function storeAdmin(Request $request): JsonResponse
    {
        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'full_name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'role' => 'required|in:admin,superadmin',
            'is_active' => 'required|boolean',
            'password' => 'required|string|min:6',
            'avatar_url' => 'nullable|string|max:1000',
        ], [
            'email.unique' => 'البريد الإلكتروني مستخدم بالفعل.',
            'password.min' => 'كلمة المرور يجب أن تكون 6 خانات على الأقل.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'detail' => $validator->errors()->first()
            ], 400);
        }

        $user = new User();
        $user->full_name = $request->full_name;
        $user->name = $request->full_name;
        $user->email = $request->email;
        $user->role = $request->role;
        $user->is_active = $request->is_active;
        $user->hashed_password = \Illuminate\Support\Facades\Hash::make($request->password);
        $user->password = $request->password;
        $user->avatar_url = $request->avatar_url;
        $user->avatar = $request->avatar_url;
        $user->save();

        return response()->json($user, 201);
    }

    /**
     * Update system admin details.
     */
    public function updateAdmin(Request $request, $id): JsonResponse
    {
        $user = User::find($id);
        if (!$user) {
            return response()->json(['detail' => 'المشرف غير موجود'], 404);
        }

        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'full_name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $id,
            'role' => 'required|in:admin,superadmin',
            'is_active' => 'required|boolean',
            'password' => 'nullable|string|min:6',
            'avatar_url' => 'nullable|string|max:1000',
        ], [
            'email.unique' => 'البريد الإلكتروني مستخدم بالفعل.',
            'password.min' => 'كلمة المرور الجديدة يجب أن تكون 6 خانات على الأقل.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'detail' => $validator->errors()->first()
            ], 400);
        }

        // Prevent self-deactivation or own role downgrade
        $currentUser = $request->user();
        if ($currentUser && $currentUser->id == $id) {
            if ($request->is_active == false) {
                return response()->json(['detail' => 'لا يمكنك إلغاء تفعيل حسابك الحالي'], 400);
            }
            if ($currentUser->role == 'superadmin' && $request->role != 'superadmin') {
                return response()->json(['detail' => 'لا يمكنك تغيير صلاحيات حسابك الحالي'], 400);
            }
        }

        $user->full_name = $request->full_name;
        $user->name = $request->full_name;
        $user->email = $request->email;
        $user->role = $request->role;
        $user->is_active = $request->is_active;
        
        if ($request->filled('password')) {
            $user->hashed_password = \Illuminate\Support\Facades\Hash::make($request->password);
            $user->password = $request->password;
        }
        
        $user->avatar_url = $request->avatar_url;
        $user->avatar = $request->avatar_url;
        $user->save();

        return response()->json($user);
    }

    /**
     * Delete system admin account.
     */
    public function destroyAdmin(Request $request, $id): JsonResponse
    {
        $currentUser = $request->user();
        if ($currentUser && $currentUser->id == $id) {
            return response()->json(['detail' => 'لا يمكنك حذف حسابك الحالي'], 400);
        }

        $user = User::find($id);
        if (!$user) {
            return response()->json(['detail' => 'المشرف غير موجود'], 404);
        }

        // Ensure this route only deletes administrative users
        if (!in_array($user->role, ['admin', 'superadmin'])) {
            return response()->json(['detail' => 'غير مصرح بحذف هذا الحساب من هنا'], 403);
        }

        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'تم حذف حساب المشرف بنجاح'
        ]);
    }
}
