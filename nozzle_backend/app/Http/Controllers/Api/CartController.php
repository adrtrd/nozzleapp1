<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CartItem;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CartController extends Controller
{
    /**
     * Get authenticated user ID from manually parsed JWT.
     */
    private function getAuthenticatedUserId(Request $request): ?int
    {
        if (auth()->check()) {
            return auth()->id();
        }

        $authHeader = $request->header('Authorization');
        if ($authHeader && preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
            $token = $matches[1];
            try {
                $payload = \App\Helpers\JWTHelper::decode($token);
                if ($payload && isset($payload['sub'])) {
                    $email = $payload['sub'];
                    $user = \App\Models\User::where('email', $email)->orWhere('phone', $email)->first();
                    if ($user && $user->is_active) {
                        return $user->id;
                    }
                }
            } catch (\Exception $e) {
                // Ignore decoding errors
            }
        }

        return null;
    }

    /**
     * Display the user's or guest's cart.
     */
    public function index(Request $request): JsonResponse
    {
        $sessionId = $request->query('session_key') ?: $request->query('session_id') ?: $request->query('session');
        $userId = $this->getAuthenticatedUserId($request);

        $query = CartItem::with('product');

        if ($userId) {
            $query->where('user_id', $userId);
        } elseif ($sessionId) {
            $query->where('session_id', $sessionId);
        } else {
            return response()->json([
                'success' => true,
                'data' => [
                    'items' => [],
                    'summary' => [
                        'subtotal' => 0.0,
                        'vat' => 0.0,
                        'shipping_fee' => 0.0,
                        'total' => 0.0
                    ]
                ]
            ]);
        }

        $items = $query->get();
        $formattedItems = [];
        $subtotal = 0.0;

        foreach ($items as $item) {
            $prod = $item->product;
            if (!$prod || $prod->is_deleted) {
                continue;
            }

            $itemPrice = $prod->sale_price ?: $prod->price;
            $totalItemPrice = $itemPrice * $item->quantity;
            $subtotal += $totalItemPrice;

            $imageUrl = $prod->image_url;
            if ($imageUrl && !str_starts_with($imageUrl, 'http')) {
                $imageUrl = rtrim(request()->getSchemeAndHttpHost(), '/') . '/' . ltrim($imageUrl, '/');
            }

            $formattedItems[] = [
                'id' => $item->id,
                'product_id' => $item->product_id,
                'quantity' => $item->quantity,
                'options' => $item->options ?: new \stdClass(),
                'created_at' => $item->created_at ? $item->created_at->toIso8601String() : null,
                'product' => [
                    'id' => $prod->id,
                    'name' => $prod->name,
                    'price' => (float)$prod->price,
                    'sale_price' => $prod->sale_price ? (float)$prod->sale_price : null,
                    'image_url' => $imageUrl,
                    'stock' => (int)($prod->stock_quantity ?: 0),
                    'stock_quantity' => (int)($prod->stock_quantity ?: 0),
                    'stock_status' => ($prod->stock_quantity ?: 0) <= 0 ? 'out_of_stock' : 'in_stock',
                    'is_available' => ($prod->stock_quantity ?: 0) > 0 && $prod->is_active && $prod->status == 'active',
                    'in_stock' => ($prod->stock_quantity ?: 0) > 0,
                    'quantity' => (int)($prod->stock_quantity ?: 0),
                ]
            ];
        }

        $taxRateSetting = \App\Models\Setting::where('key', 'tax_rate')->first();
        $taxRate = $taxRateSetting ? (float)json_decode($taxRateSetting->value) : 15.0;

        $shippingFeeSetting = \App\Models\Setting::where('key', 'shipping_fee')->first();
        $shippingFee = $shippingFeeSetting ? (float)json_decode($shippingFeeSetting->value) : 15.0;

        $thresholdSetting = \App\Models\Setting::where('key', 'free_shipping_threshold')->first();
        $threshold = $thresholdSetting ? (float)json_decode($thresholdSetting->value) : 150.0;

        $vat = $subtotal * ($taxRate / 100.0);
        $shipping = ($subtotal < $threshold && $subtotal > 0) ? $shippingFee : 0.0;
        $total = $subtotal + $vat + $shipping;

        return response()->json([
            'success' => true,
            'data' => [
                'items' => $formattedItems,
                'summary' => [
                    'subtotal' => round($subtotal, 2),
                    'vat' => round($vat, 2),
                    'shipping_fee' => $shipping,
                    'total' => round($total, 2)
                ]
            ]
        ]);
    }

    /**
     * Add an item to the cart.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'product_id' => 'required|integer|exists:products,id',
            'quantity' => 'required|integer|min:1',
            'session_id' => 'nullable|string',
            'session_key' => 'nullable|string',
            'session' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'detail' => 'بيانات المدخلات غير صالحة',
                'errors' => $validator->errors()
            ], 422);
        }

        $productId = $request->product_id;
        $quantity = $request->quantity;
        $sessionId = $request->input('session_key') ?: $request->session_id ?: $request->input('session');
        $options = $request->input('options', []);

        $product = Product::find($productId);
        if (!$product || $product->is_deleted) {
            return response()->json([
                'success' => false,
                'detail' => 'المنتج غير موجود'
            ], 404);
        }

        if ($product->stock_quantity < $quantity) {
            return response()->json([
                'success' => false,
                'detail' => 'الكمية المطلوبة تتجاوز المخزون المتوفر'
            ], 400);
        }

        $size = $options['size'] ?? null;
        $color = $options['color'] ?? null;
        $userId = $this->getAuthenticatedUserId($request);

        $query = CartItem::where('product_id', $productId)
            ->where('selected_size', $size)
            ->where('selected_color', $color);

        if ($userId) {
            $query->where('user_id', $userId);
        } elseif ($sessionId) {
            $query->where('session_id', $sessionId);
        } else {
            return response()->json([
                'success' => false,
                'detail' => 'الرجاء تسجيل الدخول أو توفير معرف الجلسة'
            ], 400);
        }

        $existingItem = $query->first();

        if ($existingItem) {
            $existingItem->quantity += $quantity;
            $existingItem->save();
            $item = $existingItem;
        } else {
            $item = CartItem::create([
                'user_id' => $userId ?: null,
                'session_id' => $userId ? null : $sessionId,
                'product_id' => $productId,
                'quantity' => $quantity,
                'options' => $options,
                'selected_size' => $size,
                'selected_color' => $color,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'تم إضافة المنتج للسلة بنجاح',
            'data' => [
                'id' => $item->id,
                'product_id' => $item->product_id,
                'quantity' => $item->quantity
            ]
        ]);
    }

    /**
     * Update cart item quantity.
     */
    public function update(Request $request): JsonResponse
    {
        $itemId = $request->query('item_id') ?: $request->item_id;

        $validator = Validator::make($request->all(), [
            'quantity' => 'required|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'detail' => 'بيانات غير صالحة',
                'errors' => $validator->errors()
            ], 422);
        }

        $item = CartItem::find($itemId);
        if (!$item) {
            return response()->json([
                'success' => false,
                'detail' => 'عنصر السلة غير موجود'
            ], 404);
        }

        $product = $item->product;
        if (!$product || $product->stock_quantity < $request->quantity) {
            return response()->json([
                'success' => false,
                'detail' => 'الكمية المطلوبة تتجاوز المخزون المتوفر'
            ], 400);
        }

        $item->quantity = $request->quantity;
        if ($request->has('options')) {
            $item->options = $request->options;
            $item->selected_size = $request->options['size'] ?? null;
            $item->selected_color = $request->options['color'] ?? null;
        }
        $item->save();

        return response()->json([
            'success' => true,
            'message' => 'تم تحديث الكمية بالسلة',
            'data' => [
                'id' => $item->id,
                'quantity' => $item->quantity
            ]
        ]);
    }

    /**
     * Remove an item from the cart.
     */
    public function destroy(Request $request, $itemId): JsonResponse
    {
        $item = CartItem::find($itemId);
        if (!$item) {
            return response()->json([
                'success' => false,
                'detail' => 'عنصر السلة غير موجود'
            ], 404);
        }

        $item->delete();

        return response()->json([
            'success' => true,
            'message' => 'تم حذف المنتج من السلة بنجاح'
        ]);
    }

    /**
     * Clear the cart.
     */
    public function clear(Request $request): JsonResponse
    {
        $sessionId = $request->query('session_key') ?: $request->query('session_id') ?: $request->query('session') ?: $request->input('session_key') ?: $request->session_id ?: $request->input('session');
        $userId = $this->getAuthenticatedUserId($request);

        if ($userId) {
            CartItem::where('user_id', $userId)->delete();
        } elseif ($sessionId) {
            CartItem::where('session_id', $sessionId)->delete();
        } else {
            return response()->json([
                'success' => false,
                'detail' => 'الرجاء تسجيل الدخول أو توفير معرف الجلسة'
            ], 400);
        }

        return response()->json([
            'success' => true,
            'message' => 'تم تفريغ السلة بنجاح'
        ]);
    }
}
