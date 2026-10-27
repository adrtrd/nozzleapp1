<?php

use App\Http\Controllers\Api\BannerController;
use App\Http\Controllers\Api\BrandController;
use App\Http\Controllers\Api\CategoryBannerController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CouponController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\OTPController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ProductTagController;
use App\Http\Controllers\Api\SpecialOfferController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\UploadController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'status' => 'success',
        'message' => 'Nozzle Laravel API is running successfully.'
    ]);
});

Route::post('/verify_phone', [OTPController::class, 'handle']);

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// Categories
Route::get('/categories', [CategoryController::class, 'index']);

// Products
Route::get('/products', [ProductController::class, 'index']);
Route::get('/brands', [BrandController::class, 'index']); // New
Route::get('/products/tags', [ProductTagController::class, 'index']); // New
Route::get('/products/{product}', [ProductController::class, 'show']);
Route::get('/categories/{category}/products', [ProductController::class, 'byCategory']);

// Root Product Tags Endpoints (aliases for /v1/product-tags)
Route::get('/product-tags', [ProductTagController::class, 'index']);
Route::post('/product-tags', [ProductTagController::class, 'store']);
Route::get('/product-tags/{id}', [ProductTagController::class, 'show']);
Route::put('/product-tags/{id}', [ProductTagController::class, 'update']);
Route::post('/product-tags/{id}', [ProductTagController::class, 'update']);
Route::delete('/product-tags/{id}', [ProductTagController::class, 'destroy']);

// V1 API Endpoints for Product Tags & Categories
Route::prefix('v1')->group(function () {
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::post('/categories', [CategoryController::class, 'store']);
    Route::put('/categories/{id}', [CategoryController::class, 'update']);
    Route::delete('/categories/{id}', [CategoryController::class, 'destroy']);

    Route::get('/product-tags', [ProductTagController::class, 'index']);
    Route::post('/product-tags', [ProductTagController::class, 'store']);
    Route::get('/product-tags/{id}', [ProductTagController::class, 'show']);
    Route::put('/product-tags/{id}', [ProductTagController::class, 'update']);
    Route::post('/product-tags/{id}', [ProductTagController::class, 'update']); // Support multipart/form-data files uploads
    Route::delete('/product-tags/{id}', [ProductTagController::class, 'destroy']);
    
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/settings', [SettingsController::class, 'index']);

    // Services & Bookings (Client V1)
    Route::get('/services', [\App\Http\Controllers\Api\ServiceController::class, 'indexV1']);
    Route::get('/services/categories', [\App\Http\Controllers\Api\ServiceController::class, 'categories']);
    Route::get('/services/appointments', [\App\Http\Controllers\Api\ServiceBookingController::class, 'userBookings'])->middleware('jwt.auth');
    Route::get('/services/my-bookings', [\App\Http\Controllers\Api\ServiceBookingController::class, 'userBookings'])->middleware('jwt.auth');
    Route::get('/services/{id}', [\App\Http\Controllers\Api\ServiceController::class, 'show']);
    Route::post('/service-requests', [\App\Http\Controllers\Api\ServiceBookingController::class, 'store']);
    Route::get('/service-requests', [\App\Http\Controllers\Api\ServiceBookingController::class, 'index']);
    Route::post('/services/book', [\App\Http\Controllers\Api\ServiceBookingController::class, 'store']);

    // Shopping Cart (Client V1)
    Route::get('/basket', [\App\Http\Controllers\Api\CartController::class, 'index']);
    Route::post('/basket/add', [\App\Http\Controllers\Api\CartController::class, 'store']);
    Route::put('/basket/update', [\App\Http\Controllers\Api\CartController::class, 'update']);
    Route::post('/basket/update', [\App\Http\Controllers\Api\CartController::class, 'update']);
    Route::put('/basket/update/{item_id}', [\App\Http\Controllers\Api\CartController::class, 'update']);
    Route::delete('/basket/remove/{item_id}', [\App\Http\Controllers\Api\CartController::class, 'destroy']);
    Route::post('/basket/remove/{item_id}', [\App\Http\Controllers\Api\CartController::class, 'destroy']);
    Route::delete('/basket/remove', [\App\Http\Controllers\Api\CartController::class, 'destroy']);
    Route::post('/basket/clear', [\App\Http\Controllers\Api\CartController::class, 'clear']);
    Route::delete('/basket/clear', [\App\Http\Controllers\Api\CartController::class, 'clear']);

    // Profile Cart (Alternative Endpoint V1)
    Route::get('/profile/basket', [\App\Http\Controllers\Api\CartController::class, 'index']);
    Route::post('/profile/basket/add', [\App\Http\Controllers\Api\CartController::class, 'store']);
    Route::put('/profile/basket/update', [\App\Http\Controllers\Api\CartController::class, 'update']);
    Route::post('/profile/basket/update', [\App\Http\Controllers\Api\CartController::class, 'update']);
    Route::delete('/profile/basket/remove/{item_id}', [\App\Http\Controllers\Api\CartController::class, 'destroy']);
    Route::post('/profile/basket/clear', [\App\Http\Controllers\Api\CartController::class, 'clear']);

    // Mobile Client Auth Flow
    Route::post('/auth/send-otp', [\App\Http\Controllers\Api\OTPController::class, 'sendOtpApi']);
    Route::post('/auth/verify-otp', [\App\Http\Controllers\Api\OTPController::class, 'verifyOtpApi']);
    Route::post('/auth/complete-profile', [\App\Http\Controllers\Api\OTPController::class, 'completeProfileApi']);

    // Coupon Validation (POST)
    Route::post('/coupons/validate', [CouponController::class, 'validateCouponPost']);

    // Favorites
    Route::get('/favorites', [\App\Http\Controllers\FavoriteController::class, 'index']);
    Route::post('/favorites', [\App\Http\Controllers\FavoriteController::class, 'store']);
    Route::delete('/favorites/{product_id}', [\App\Http\Controllers\FavoriteController::class, 'destroy']);
    Route::delete('/favorites', [\App\Http\Controllers\FavoriteController::class, 'destroy']);
    Route::get('/favorites/check', [\App\Http\Controllers\FavoriteController::class, 'check']);

    // Authenticated Auth Endpoints V1 alias
    Route::middleware('jwt.auth')->group(function () {
        Route::get('/auth/me', [\App\Http\Controllers\Api\AuthController::class, 'me']);
        Route::put('/auth/profile', [\App\Http\Controllers\Api\AuthController::class, 'updateProfile']);
        Route::post('/auth/logout', [\App\Http\Controllers\Api\AuthController::class, 'logout']);
    });
});

// Auth Endpoints
Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('jwt.auth')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::put('/auth/profile', [AuthController::class, 'updateProfile']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    
    // Settings
    Route::get('/settings', [SettingsController::class, 'index']);
    Route::post('/settings', [SettingsController::class, 'save']);

    // Notifications (Push campaigns)
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications', [NotificationController::class, 'store']);
    Route::delete('/notifications/{id}', [NotificationController::class, 'destroy']);

    // Dashboard
    Route::get('/stats', [DashboardController::class, 'stats']);
    Route::get('/logs', [DashboardController::class, 'logs']);

    // Inventory
    Route::get('/inventory/dashboard', [InventoryController::class, 'index']);
    Route::post('/inventory/stock-update', [InventoryController::class, 'updateStock']);
    Route::get('/inventory/history/{product_id}', [InventoryController::class, 'history']);
    Route::put('/inventory/thresholds/{product_id}', [InventoryController::class, 'updateThresholds']);

    // Image/File Uploads
    Route::post('/upload', [UploadController::class, 'uploadFile']);
    Route::post('/upload/image', [UploadController::class, 'uploadImage']);
    Route::post('/v1/upload/image', [UploadController::class, 'uploadImage']);
    Route::delete('/upload/image/{public_id}', [UploadController::class, 'deleteImage'])->where('public_id', '.*');
    Route::delete('/v1/upload/image/{public_id}', [UploadController::class, 'deleteImage'])->where('public_id', '.*');

    // Products Management (Admin write ops)
    Route::post('/products', [ProductController::class, 'store']);
    Route::put('/products/{id}', [ProductController::class, 'update']);
    Route::delete('/products/{id}', [ProductController::class, 'destroy']);

    // Categories Management (Admin write ops)
    Route::post('/categories', [CategoryController::class, 'store']);
    Route::put('/categories/sort/order', [CategoryController::class, 'reorder']);
    Route::put('/categories/{id}', [CategoryController::class, 'update']);
    Route::delete('/categories/{id}', [CategoryController::class, 'destroy']);

    // Coupons Management (Admin write/read ops)
    Route::get('/coupons', [CouponController::class, 'index']);
    Route::post('/coupons', [CouponController::class, 'store']);
    Route::put('/coupons/{id}', [CouponController::class, 'update']);
    Route::delete('/coupons/{id}', [CouponController::class, 'destroy']);

    // Banners Management (Admin write/read ops)
    Route::get('/banners/admin', [BannerController::class, 'indexAdmin']);
    Route::post('/banners', [BannerController::class, 'store']);
    Route::put('/banners/sort/order', [BannerController::class, 'reorder']);
    Route::put('/banners/{id}', [BannerController::class, 'update']);
    Route::delete('/banners/{id}', [BannerController::class, 'destroy']);

    // Services Management (Admin ops)
    Route::get('/v1/admin/services', [\App\Http\Controllers\Api\ServiceController::class, 'indexAdmin']);
    Route::get('/v1/admin/services/stats', [\App\Http\Controllers\Api\ServiceController::class, 'stats']);
    Route::post('/v1/admin/services', [\App\Http\Controllers\Api\ServiceController::class, 'store']);
    Route::put('/v1/admin/services/reorder', [\App\Http\Controllers\Api\ServiceController::class, 'reorder']);
    Route::put('/v1/admin/services/{id}', [\App\Http\Controllers\Api\ServiceController::class, 'update']);
    Route::delete('/v1/admin/services/{id}', [\App\Http\Controllers\Api\ServiceController::class, 'destroy']);

    // Service Requests/Bookings Management (Admin ops)
    Route::get('/v1/admin/service-requests', [\App\Http\Controllers\Api\ServiceBookingController::class, 'indexAdmin']);
    Route::get('/v1/admin/service-requests/{id}', [\App\Http\Controllers\Api\ServiceBookingController::class, 'showAdmin']);
    Route::get('/v1/admin/service-requests/{id}/print-data', [\App\Http\Controllers\Api\ServiceBookingController::class, 'printData']);
    Route::put('/v1/admin/service-requests/{id}/status', [\App\Http\Controllers\Api\ServiceBookingController::class, 'updateStatus']);

    // Admin Orders Management (Admin ops)
    Route::get('/v1/orders/{order}/detail', [OrderController::class, 'showDetail']);
    Route::put('/v1/orders/{order}/status', [OrderController::class, 'updateStatus']);
    Route::put('/orders/{order}/status', [OrderController::class, 'updateStatus']);

    // Admin Users/Customers Management (Admin ops)
    Route::get('/admin/users', [\App\Http\Controllers\Api\UserController::class, 'index']);
    Route::get('/v1/admin/users', [\App\Http\Controllers\Api\UserController::class, 'index']);
    Route::get('/admin/users/{id}', [\App\Http\Controllers\Api\UserController::class, 'show']);
    Route::get('/v1/admin/users/{id}', [\App\Http\Controllers\Api\UserController::class, 'show']);
    Route::delete('/customers/{id}', [\App\Http\Controllers\Api\UserController::class, 'destroy']);

    // System Admins Management (Admin CRUD)
    Route::get('/users', [\App\Http\Controllers\Api\UserController::class, 'indexAdmins']);
    Route::post('/users', [\App\Http\Controllers\Api\UserController::class, 'storeAdmin']);
    Route::put('/users/{id}', [\App\Http\Controllers\Api\UserController::class, 'updateAdmin']);
    Route::delete('/users/{id}', [\App\Http\Controllers\Api\UserController::class, 'destroyAdmin']);
});

// Banners
Route::get('/banners', [BannerController::class, 'index']);
Route::get('/category-banners', [CategoryBannerController::class, 'index']); // New

// Special Offers
Route::get('/special-offers', [SpecialOfferController::class, 'index']); // New

// Coupons
Route::get('/coupons/validate', [CouponController::class, 'validateCoupon']); // New

// Orders
Route::get('/orders', [OrderController::class, 'index']);
Route::post('/orders', [OrderController::class, 'store']);
Route::get('/orders/{order}', [OrderController::class, 'show']);
Route::put('/orders/{order}', [OrderController::class, 'update']);
Route::patch('/orders/{order}', [OrderController::class, 'update']);



// Addresses
Route::get('/addresses', [App\Http\Controllers\Api\AddressController::class, 'index']);
Route::post('/addresses', [App\Http\Controllers\Api\AddressController::class, 'store']);
Route::put('/addresses/{id}', [App\Http\Controllers\Api\AddressController::class, 'update']);
Route::delete('/addresses/{id}', [App\Http\Controllers\Api\AddressController::class, 'destroy']);
Route::post('/addresses/{id}/set-default', [App\Http\Controllers\Api\AddressController::class, 'setDefault']);

// Services
Route::get('/services', [\App\Http\Controllers\Api\ServiceController::class, 'index']);
Route::get('/services/categories', [\App\Http\Controllers\Api\ServiceController::class, 'categories']);
Route::get('/services/appointments', [\App\Http\Controllers\Api\ServiceBookingController::class, 'userBookings'])->middleware('jwt.auth');
Route::get('/services/my-bookings', [\App\Http\Controllers\Api\ServiceBookingController::class, 'userBookings'])->middleware('jwt.auth');
Route::get('/services/{id}', [\App\Http\Controllers\Api\ServiceController::class, 'show']);

// Service Bookings
Route::post('/services/book', [\App\Http\Controllers\Api\ServiceBookingController::class, 'store']);
Route::post('/service-requests', [\App\Http\Controllers\Api\ServiceBookingController::class, 'store']);
Route::get('/service-requests', [\App\Http\Controllers\Api\ServiceBookingController::class, 'index']);

// Root Shopping Cart aliases
Route::get('/basket', [\App\Http\Controllers\Api\CartController::class, 'index']);
Route::post('/basket/add', [\App\Http\Controllers\Api\CartController::class, 'store']);
Route::put('/basket/update', [\App\Http\Controllers\Api\CartController::class, 'update']);
Route::post('/basket/update', [\App\Http\Controllers\Api\CartController::class, 'update']);
Route::put('/basket/update/{item_id}', [\App\Http\Controllers\Api\CartController::class, 'update']);
Route::delete('/basket/remove/{item_id}', [\App\Http\Controllers\Api\CartController::class, 'destroy']);
Route::post('/basket/remove/{item_id}', [\App\Http\Controllers\Api\CartController::class, 'destroy']);
Route::delete('/basket/remove', [\App\Http\Controllers\Api\CartController::class, 'destroy']);
Route::post('/basket/clear', [\App\Http\Controllers\Api\CartController::class, 'clear']);
Route::delete('/basket/clear', [\App\Http\Controllers\Api\CartController::class, 'clear']);

Route::get('/profile/basket', [\App\Http\Controllers\Api\CartController::class, 'index']);
Route::post('/profile/basket/add', [\App\Http\Controllers\Api\CartController::class, 'store']);
Route::put('/profile/basket/update', [\App\Http\Controllers\Api\CartController::class, 'update']);
Route::post('/profile/basket/update', [\App\Http\Controllers\Api\CartController::class, 'update']);
Route::delete('/profile/basket/remove/{item_id}', [\App\Http\Controllers\Api\CartController::class, 'destroy']);
Route::post('/profile/basket/clear', [\App\Http\Controllers\Api\CartController::class, 'clear']);


