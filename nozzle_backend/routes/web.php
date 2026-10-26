<?php

use App\Http\Controllers\Admin\BespokeDashboardController;
use App\Http\Controllers\Admin\OrdersController;
use App\Http\Controllers\Admin\ProductsController;
use App\Http\Controllers\Admin\CategoriesController;
use App\Http\Controllers\Admin\BannersController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    if (file_exists(public_path('index.html'))) {
        return response()->file(public_path('index.html'));
    }
    return view('welcome');
});

// Bespoke Admin Panel Routes
Route::prefix('bespoke-admin')->group(function () {
    Route::get('/', [BespokeDashboardController::class, 'index'])->name('admin.dashboard');
    Route::resource('products', ProductsController::class)->names('admin.products');
    Route::resource('categories', CategoriesController::class)->names('admin.categories');
    Route::resource('orders', OrdersController::class)->names('admin.orders');
    Route::patch('orders/{order}/status', [OrdersController::class, 'updateStatus'])->name('admin.orders.updateStatus');
    
    // Banners
    Route::resource('banners', BannersController::class)->names('admin.banners');
    Route::patch('banners/{banner}/toggle', [BannersController::class, 'toggle'])->name('admin.banners.toggle');

    // Categories Toggle
    Route::patch('categories/{category}/toggle', [CategoriesController::class, 'toggle'])->name('admin.categories.toggle');
});

// Admin Dashboard Route (React SPA)
Route::get('/admin/{any?}', function () {
    if (file_exists(public_path('admin/index.html'))) {
        return response()->file(public_path('admin/index.html'));
    }
    abort(404);
})->where('any', '.*');

Route::get('/panel/{any?}', function () {
    if (file_exists(public_path('panel/index.html'))) {
        return response()->file(public_path('panel/index.html'));
    }
    if (file_exists(public_path('admin/index.html'))) {
        return response()->file(public_path('admin/index.html'));
    }
    abort(404);
})->where('any', '.*');

// Web Client Fallback Route (Flutter Web SPA)
Route::fallback(function (\Illuminate\Http\Request $request) {
    if ($request->is('api/*')) {
        return response()->json([
            'status' => 'error',
            'message' => 'API endpoint not found: ' . $request->path(),
        ], 404);
    }
    if (file_exists(public_path('index.html'))) {
        return response()->file(public_path('index.html'));
    }
    abort(404);
});


