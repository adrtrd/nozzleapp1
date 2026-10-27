<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CartItem;
use App\Models\Product;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;

class CartController extends Controller
{
    public function __construct()
    {
        $this->ensureSchema();
    }

    /**
     * Ensure cart_items table and all required columns exist in SQLite/MySQL.
     */
    private function ensureSchema(): void
    {
        try {
            if (!Schema::hasTable('cart_items')) {
                Schema::create('cart_items', function (Blueprint $table) {
                    $table->id();
                    $table->string('session_id')->nullable()->index();
                    $table->unsignedBigInteger('user_id')->nullable()->index();
                    $table->unsignedBigInteger('product_id')->index();
                    $table->integer('quantity')->default(1);
                    $table->json('options')->nullable();
                    $table->string('selected_size')->nullable();
                    $table->string('selected_color')->nullable();
                    $table->timestamps();
                });
                return;
            }

            Schema::table('cart_items', function (Blueprint $table) {
                if (!Schema::hasColumn('cart_items', 'session_id')) {
                    $table->string('session_id')->nullable();
                }
                if (!Schema::hasColumn('cart_items', 'user_id')) {
                    $table->unsignedBigInteger('user_id')->nullable();
                }
                if (!Schema::hasColumn('cart_items', 'options')) {
                    $table->text('options')->nullable();
                }
                if (!Schema::hasColumn('cart_items', 'selected_size')) {
                    $table->string('selected_size')->nullable();
                }
                if (!Schema::hasColumn('cart_items', 'selected_color')) {
                    $table->string('selected_color')->nullable();
                }
                if (!Schema::hasColumn('cart_items', 'created_at')) {
                    $table->timestamp('created_at')->nullable();
                }
                if (!Schema::hasColumn('cart_items', 'updated_at')) {
                    $table->timestamp('updated_at')->nullable();
                }
            });
        } catch (\Throwable $e) {
            // Ignore schema check errors if already migrated
        }
    }

    /**
     * Get authenticated user ID from manually parsed JWT or Auth guard.
     */
    private function getAuthenticatedUserId(Request $request): ?int
    {
        if (auth()->check()) {
            return (int) auth()->id();
        }

        if ($request->user()) {
            return (int) $request->user()->id;
        }

        $authHeader = $request->header('Authorization');
        if ($authHeader && preg_match('/Bearer\s+(\S+)/i', $authHeader, $matches)) {
            $token = $matches[1];
            try {
                $payload = \App\Helpers\JWTHelper::decode($token);
                if ($payload) {
                    $sub = $payload['sub'] ?? $payload['user_id'] ?? $payload['id'] ?? null;
                    if ($sub !== null) {
                        $user = \App\Models\User::where('email', $sub)
                            ->orWhere('phone', $sub)
                            ->when(is_numeric($sub), function ($q) use ($sub) {
                                return $q->orWhere('id', (int) $sub);
                            })
                            ->first();
                        if ($user) {
                            return (int) $user->id;
                        }
                    }
                }
            } catch (\Throwable $e) {
                // Ignore decoding errors
            }
        }

        return null;
    }

    /**
     * Resolve user ID and session ID from request with safe fallback.
     */
    private function resolveSessionAndUser(Request $request): array
    {
        $sessionId = $request->query('session_key')
            ?: $request->query('session_id')
            ?: $request->query('session')
            ?: $request->input('session_key')
            ?: $request->input('session_id')
            ?: $request->input('session')
            ?: $request->header('X-Session-Id');

        $userId = $this->getAuthenticatedUserId($request);
        if (!$userId && $request->filled('user_id')) {
            $userId = (int) $request->input('user_id');
        }

        if (!$userId && !$sessionId) {
            $sessionId = 'guest_' . md5(($request->ip() ?? '0.0.0.0') . '|' . ($request->userAgent() ?? 'nozzle'));
        }

        return [$userId, $sessionId];
    }

    /**
     * Format a CartItem with its associated Product for API responses.
     */
    private function formatCartItem(CartItem $item, Product $prod): array
    {
        $imageUrl = $prod->image_url;
        if (!$imageUrl && !empty($prod->images)) {
            $imgs = is_string($prod->images) ? json_decode($prod->images, true) : $prod->images;
            if (is_array($imgs) && !empty($imgs[0])) {
                $imageUrl = $imgs[0];
            }
        }
        if ($imageUrl && !str_starts_with($imageUrl, 'http')) {
            $imageUrl = rtrim(request()->getSchemeAndHttpHost(), '/') . '/' . ltrim($imageUrl, '/');
        }

        $stockQty = $prod->stock_quantity !== null ? (int) $prod->stock_quantity : 100;
        if ($stockQty <= 0) {
            $stockQty = 100;
        }

        return [
            'id' => (int) $item->id,
            'product_id' => (int) $item->product_id,
            'quantity' => (int) $item->quantity,
            'selected_size' => $item->selected_size,
            'selected_color' => $item->selected_color,
            'options' => $item->options ?: new \stdClass(),
            'created_at' => $item->created_at ? \Carbon\Carbon::parse($item->created_at)->toIso8601String() : null,
            'product' => [
                'id' => (int) $prod->id,
                'name' => $prod->name,
                'price' => (float) $prod->price,
                'sale_price' => $prod->sale_price ? (float) $prod->sale_price : null,
                'image_url' => $imageUrl,
                'stock' => $stockQty,
                'stock_quantity' => $stockQty,
                'stock_status' => 'in_stock',
                'is_available' => (bool) ($prod->is_active ?? true),
                'in_stock' => true,
                'quantity' => $stockQty,
            ],
        ];
    }

    /**
     * Display the user's or guest's cart.
     */
    public function index(Request $request): JsonResponse
    {
        [$userId, $sessionId] = $this->resolveSessionAndUser($request);

        $query = CartItem::with('product');

        if ($userId && $sessionId) {
            $query->where(function ($q) use ($userId, $sessionId) {
                $q->where('user_id', $userId)
                  ->orWhere('session_id', $sessionId);
            });
        } elseif ($userId) {
            $query->where('user_id', $userId);
        } elseif ($sessionId) {
            $query->where('session_id', $sessionId);
        }

        $items = $query->orderBy('id', 'asc')->get();
        $formattedItems = [];
        $subtotal = 0.0;

        foreach ($items as $item) {
            $prod = $item->product;
            if (!$prod || $prod->is_deleted) {
                continue;
            }

            if ($userId && !$item->user_id) {
                $item->user_id = $userId;
                $item->save();
            }

            $itemPrice = ($prod->sale_price !== null && (float) $prod->sale_price > 0)
                ? (float) $prod->sale_price
                : (float) $prod->price;
            $totalItemPrice = $itemPrice * $item->quantity;
            $subtotal += $totalItemPrice;

            $formattedItems[] = $this->formatCartItem($item, $prod);
        }

        $taxRateSetting = \App\Models\Setting::where('key', 'tax_rate')->first();
        $taxRate = $taxRateSetting ? (float) json_decode($taxRateSetting->value) : 15.0;

        $shippingFeeSetting = \App\Models\Setting::where('key', 'shipping_fee')->first();
        $shippingFee = $shippingFeeSetting ? (float) json_decode($shippingFeeSetting->value) : 15.0;

        $thresholdSetting = \App\Models\Setting::where('key', 'free_shipping_threshold')->first();
        $threshold = $thresholdSetting ? (float) json_decode($thresholdSetting->value) : 150.0;

        $vat = $subtotal * ($taxRate / 100.0);
        $shipping = ($subtotal < $threshold && $subtotal > 0) ? $shippingFee : 0.0;
        $total = $subtotal + $vat + $shipping;

        return response()->json([
            'success' => true,
            'status' => 'success',
            'data' => [
                'items' => $formattedItems,
                'summary' => [
                    'subtotal' => round($subtotal, 2),
                    'vat' => round($vat, 2),
                    'shipping_fee' => $shipping,
                    'total' => round($total, 2),
                ],
            ],
        ]);
    }

    /**
     * Add an item to the cart.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'product_id' => 'required|integer',
            'quantity' => 'nullable|integer|min:1',
            'session_id' => 'nullable|string',
            'session_key' => 'nullable|string',
            'session' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'detail' => 'بيانات المدخلات غير صالحة',
                'errors' => $validator->errors(),
            ], 422);
        }

        $productId = (int) $request->input('product_id');
        $quantity = max(1, (int) $request->input('quantity', 1));
        $options = $request->input('options', []);
        if (is_string($options)) {
            $options = json_decode($options, true) ?: [];
        }
        if (!is_array($options)) {
            $options = [];
        }

        $product = Product::find($productId);
        if (!$product || $product->is_deleted) {
            return response()->json([
                'success' => false,
                'detail' => 'المنتج غير موجود',
            ], 404);
        }

        if ($product->stock_quantity !== null && (int) $product->stock_quantity > 0 && (int) $product->stock_quantity < $quantity) {
            return response()->json([
                'success' => false,
                'detail' => 'الكمية المطلوبة تتجاوز المخزون المتوفر',
            ], 400);
        }

        $size = $options['size'] ?? $request->input('selected_size') ?? null;
        $color = $options['color'] ?? $request->input('selected_color') ?? null;
        [$userId, $sessionId] = $this->resolveSessionAndUser($request);

        $query = CartItem::where('product_id', $productId)
            ->where('selected_size', $size)
            ->where('selected_color', $color);

        if ($userId && $sessionId) {
            $query->where(function ($q) use ($userId, $sessionId) {
                $q->where('user_id', $userId)
                  ->orWhere('session_id', $sessionId);
            });
        } elseif ($userId) {
            $query->where('user_id', $userId);
        } else {
            $query->where('session_id', $sessionId);
        }

        $existingItem = $query->first();

        if ($existingItem) {
            $existingItem->quantity += $quantity;
            if ($userId && !$existingItem->user_id) {
                $existingItem->user_id = $userId;
            }
            if ($sessionId && !$existingItem->session_id) {
                $existingItem->session_id = $sessionId;
            }
            $existingItem->save();
            $item = $existingItem;
        } else {
            $item = CartItem::create([
                'user_id' => $userId ?: null,
                'session_id' => $sessionId ?: null,
                'product_id' => $productId,
                'quantity' => $quantity,
                'options' => $options,
                'selected_size' => $size,
                'selected_color' => $color,
            ]);
        }

        return response()->json([
            'success' => true,
            'status' => 'success',
            'message' => 'تم إضافة المنتج للسلة بنجاح',
            'data' => $this->formatCartItem($item, $product),
        ]);
    }

    /**
     * Update cart item quantity.
     */
    public function update(Request $request, $routeItemId = null): JsonResponse
    {
        $itemId = $routeItemId ?: $request->query('item_id') ?: $request->input('item_id') ?: $request->input('id') ?: $request->input('product_id');

        $validator = Validator::make($request->all(), [
            'quantity' => 'required|integer|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'detail' => 'بيانات غير صالحة',
                'errors' => $validator->errors(),
            ], 422);
        }

        [$userId, $sessionId] = $this->resolveSessionAndUser($request);

        $item = CartItem::find($itemId);
        if (!$item && $itemId) {
            $fallbackQuery = CartItem::where('product_id', $itemId);
            if ($userId && $sessionId) {
                $fallbackQuery->where(function ($q) use ($userId, $sessionId) {
                    $q->where('user_id', $userId)->orWhere('session_id', $sessionId);
                });
            } elseif ($userId) {
                $fallbackQuery->where('user_id', $userId);
            } elseif ($sessionId) {
                $fallbackQuery->where('session_id', $sessionId);
            }
            $item = $fallbackQuery->latest('id')->first() ?: CartItem::where('product_id', $itemId)->latest('id')->first();
        }

        if (!$item) {
            return response()->json([
                'success' => false,
                'detail' => 'عنصر السلة غير موجود',
            ], 404);
        }

        $newQty = (int) $request->input('quantity');
        if ($newQty <= 0) {
            $item->delete();
            return response()->json([
                'success' => true,
                'message' => 'تم حذف المنتج من السلة بنجاح',
            ]);
        }

        $product = $item->product;
        if ($product && $product->stock_quantity !== null && (int) $product->stock_quantity > 0 && (int) $product->stock_quantity < $newQty) {
            return response()->json([
                'success' => false,
                'detail' => 'الكمية المطلوبة تتجاوز المخزون المتوفر',
            ], 400);
        }

        $item->quantity = $newQty;
        if ($request->has('options')) {
            $opts = is_string($request->options) ? (json_decode($request->options, true) ?: []) : (array) $request->options;
            $item->options = $opts;
            $item->selected_size = $opts['size'] ?? null;
            $item->selected_color = $opts['color'] ?? null;
        }
        $item->save();

        return response()->json([
            'success' => true,
            'status' => 'success',
            'message' => 'تم تحديث الكمية بالسلة',
            'data' => [
                'id' => (int) $item->id,
                'product_id' => (int) $item->product_id,
                'quantity' => (int) $item->quantity,
            ],
        ]);
    }

    /**
     * Remove an item from the cart.
     */
    public function destroy(Request $request, $itemId = null): JsonResponse
    {
        $itemId = $itemId ?: $request->query('item_id') ?: $request->input('item_id') ?: $request->input('id');
        [$userId, $sessionId] = $this->resolveSessionAndUser($request);

        $item = CartItem::find($itemId);
        if (!$item && $itemId) {
            $fallbackQuery = CartItem::where('product_id', $itemId);
            if ($userId && $sessionId) {
                $fallbackQuery->where(function ($q) use ($userId, $sessionId) {
                    $q->where('user_id', $userId)->orWhere('session_id', $sessionId);
                });
            } elseif ($userId) {
                $fallbackQuery->where('user_id', $userId);
            } elseif ($sessionId) {
                $fallbackQuery->where('session_id', $sessionId);
            }
            $item = $fallbackQuery->latest('id')->first();
        }

        if ($item) {
            $item->delete();
        }

        return response()->json([
            'success' => true,
            'status' => 'success',
            'message' => 'تم حذف المنتج من السلة بنجاح',
        ]);
    }

    /**
     * Clear the cart.
     */
    public function clear(Request $request): JsonResponse
    {
        [$userId, $sessionId] = $this->resolveSessionAndUser($request);

        $query = CartItem::query();
        if ($userId && $sessionId) {
            $query->where(function ($q) use ($userId, $sessionId) {
                $q->where('user_id', $userId)
                  ->orWhere('session_id', $sessionId);
            });
            $query->delete();
        } elseif ($userId) {
            CartItem::where('user_id', $userId)->delete();
        } elseif ($sessionId) {
            CartItem::where('session_id', $sessionId)->delete();
        }

        return response()->json([
            'success' => true,
            'status' => 'success',
            'message' => 'تم تفريغ السلة بنجاح',
        ]);
    }
}
