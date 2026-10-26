<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Category;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    /**
     * Display a listing of all available products.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Product::where('is_deleted', false)->with(['category', 'brandRelation']);

        if ($request->has('brand_id') && $request->brand_id) {
            $query->where('brand_id', $request->brand_id);
        }

        if ($request->has('category_id') && $request->category_id) {
            $catId = $request->category_id;
            $query->where(function ($q) use ($catId) {
                $q->where('category_id', $catId)
                  ->orWhere('subcategory_id', $catId);
            });
        }

        if ($request->has('subcategory_id') && $request->subcategory_id) {
            $query->where('subcategory_id', $request->subcategory_id);
        }

        if ($request->has('is_featured')) {
            $query->where('is_featured', $request->boolean('is_featured'));
        }

        if ($request->has('tag_id') && $request->tag_id) {
            $query->whereHas('tags', function ($q) use ($request) {
                $q->where('product_tags.id', $request->tag_id)
                  ->orWhere('product_tags.parent_id', $request->tag_id);
            });
        }

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        } elseif ($request->is('*v1*')) {
            // Mobile app client (v1) only gets active products
            $query->where('status', 'active')->where('is_active', true);
        }

        $total = $query->count();

        $limit = $request->input('limit', 100);
        $skip = $request->input('skip', 0);
        $query->skip($skip)->take($limit);

        $products = $query->get()->map(function ($product) {
            return $this->transformProduct($product);
        });
            
        return response()->json([
            'status' => 'success',
            'success' => true,
            'total' => $total,
            'data' => $products
        ]);
    }

    /**
     * Display the specified product.
     */
    public function show($id): JsonResponse
    {
        $product = Product::where('id', $id)->where('is_deleted', false)->with(['category', 'brandRelation'])->first();

        if (!$product) {
            return response()->json([
                'status' => 'error',
                'message' => 'Product not found.'
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $this->transformProduct($product)
        ]);
    }

    /**
     * Store a newly created product.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string',
            'price' => 'required|numeric',
            'tax_rate' => 'nullable|numeric',
            'category_id' => 'required|integer',
        ]);

        if ($request->filled('sku')) {
            $existing = Product::where('sku', $request->sku)->where('is_deleted', false)->first();
            if ($existing) {
                return response()->json(['detail' => 'SKU already exists'], 400);
            }
        }

        $images = is_string($request->input('images')) ? json_decode($request->input('images'), true) : $request->input('images');
        $variants = is_string($request->input('variants')) ? json_decode($request->input('variants'), true) : $request->input('variants');
        $features = is_string($request->input('features')) ? json_decode($request->input('features'), true) : $request->input('features');
        $specifications = is_string($request->input('specifications')) ? json_decode($request->input('specifications'), true) : $request->input('specifications');
        $tags = is_string($request->input('tags')) ? json_decode($request->input('tags'), true) : $request->input('tags');

        $p = new Product();
        $p->name = $request->input('name');
        $p->description = $request->input('description');
        $p->price = $request->input('price');
        $p->sale_price = $request->input('sale_price');
        $p->tax_rate = $request->input('tax_rate') !== null ? (double)$request->input('tax_rate') : (double)(\Illuminate\Support\Facades\DB::table('system_settings')->where('key', 'tax_rate')->value('value') ?? 15.0);
        $p->stock_quantity = $request->input('stock_quantity') ?: $request->input('quantity', 0);
        $p->low_stock_threshold = $request->input('low_stock_threshold', 10);
        $p->reorder_point = $request->input('reorder_point', 20);
        $p->max_stock = $request->input('max_stock', 100);
        $p->sku = $request->input('sku');
        $p->category_id = $request->input('category_id');
        $p->subcategory_id = $request->input('subcategory_id');
        $p->image_url = $request->input('image_url') ?: ($images[0] ?? null);
        $p->images = json_encode($images ?: []);
        $p->variants = json_encode($variants ?: []);
        $p->features = json_encode($features ?: []);
        $p->specifications = json_encode($specifications ?: new \stdClass());
        $p->seo_title = $request->input('seo_title');
        $p->seo_description = $request->input('seo_description');
        $p->slug = $request->input('slug') ?: Str::slug($request->input('name'));
        if (empty($p->slug)) {
            $p->slug = 'product-' . time();
        }
        $p->status = $request->input('status', 'active');
        $p->is_active = $request->boolean('is_active', true);
        $p->is_deleted = false;
        if (Schema::hasColumn('products', 'image')) {
            $p->image = $request->input('image_url') ?: ($images[0] ?? null);
        }
        $p->save();

        if ($request->has('tag_ids')) {
            $tagIds = is_string($request->input('tag_ids')) ? json_decode($request->input('tag_ids'), true) : $request->input('tag_ids');
            if (is_array($tagIds)) {
                $p->tags()->sync($tagIds);
            }
        }

        try {
            AuditLog::create([
                'user_id' => auth()->id(),
                'action' => 'CREATE_PRODUCT',
                'details' => "Created product {$p->name} (Price: {$p->price})",
                'timestamp' => now()
            ]);
        } catch (\Throwable $e) {
            // Ignore audit log errors
        }

        return response()->json([
            'status' => 'success',
            'data' => $this->transformProduct($p)
        ]);
    }

    /**
     * Update the specified product.
     */
    public function update(Request $request, $id): JsonResponse
    {
        $p = Product::where('id', $id)->where('is_deleted', false)->first();
        if (!$p) {
            return response()->json(['detail' => 'Product not found'], 404);
        }

        if ($request->filled('sku') && $request->sku !== $p->sku) {
            $existing = Product::where('sku', $request->sku)->where('is_deleted', false)->first();
            if ($existing) {
                return response()->json(['detail' => 'SKU already exists'], 400);
            }
        }

        if ($request->has('name')) $p->name = $request->input('name');
        if ($request->has('description')) $p->description = $request->input('description');
        if ($request->has('price')) $p->price = $request->input('price');
        if ($request->has('sale_price')) $p->sale_price = $request->input('sale_price');
        if ($request->has('tax_rate')) $p->tax_rate = $request->input('tax_rate');
        if ($request->has('stock_quantity') || $request->has('quantity')) {
            $p->stock_quantity = $request->has('stock_quantity') ? $request->input('stock_quantity') : $request->input('quantity');
        }
        if ($request->has('low_stock_threshold')) $p->low_stock_threshold = $request->input('low_stock_threshold');
        if ($request->has('reorder_point')) $p->reorder_point = $request->input('reorder_point');
        if ($request->has('max_stock')) $p->max_stock = $request->input('max_stock');
        if ($request->has('sku')) $p->sku = $request->input('sku');
        if ($request->has('category_id')) $p->category_id = $request->input('category_id');
        if ($request->has('subcategory_id')) $p->subcategory_id = $request->input('subcategory_id');
        if ($request->has('image_url')) $p->image_url = $request->input('image_url');
        
        if ($request->has('images')) {
            $images = is_string($request->input('images')) ? json_decode($request->input('images'), true) : $request->input('images');
            $p->images = json_encode($images ?: []);
        }
        if ($request->has('variants')) {
            $variants = is_string($request->input('variants')) ? json_decode($request->input('variants'), true) : $request->input('variants');
            $p->variants = json_encode($variants ?: []);
        }
        if ($request->has('features')) {
            $features = is_string($request->input('features')) ? json_decode($request->input('features'), true) : $request->input('features');
            $p->features = json_encode($features ?: []);
        }
        if ($request->has('specifications')) {
            $specifications = is_string($request->input('specifications')) ? json_decode($request->input('specifications'), true) : $request->input('specifications');
            $p->specifications = json_encode($specifications ?: new \stdClass());
        }
        if ($request->has('image_url') && Schema::hasColumn('products', 'image')) {
            $p->image = $request->input('image_url');
        }
        
        if ($request->has('seo_title')) $p->seo_title = $request->input('seo_title');
        if ($request->has('seo_description')) $p->seo_description = $request->input('seo_description');
        if ($request->has('slug')) $p->slug = $request->input('slug');
        if ($request->has('status')) $p->status = $request->input('status');
        if ($request->has('is_active')) $p->is_active = $request->boolean('is_active');

        $p->save();

        if ($request->has('tag_ids')) {
            $tagIds = is_string($request->input('tag_ids')) ? json_decode($request->input('tag_ids'), true) : $request->input('tag_ids');
            if (is_array($tagIds)) {
                $p->tags()->sync($tagIds);
            }
        }

        try {
            AuditLog::create([
                'user_id' => auth()->id(),
                'action' => 'UPDATE_PRODUCT',
                'details' => "Updated product {$p->name}",
                'timestamp' => now()
            ]);
        } catch (\Throwable $e) {
            // Ignore audit log errors
        }

        return response()->json([
            'status' => 'success',
            'data' => $this->transformProduct($p)
        ]);
    }

    /**
     * Delete the specified product.
     */
    public function destroy($id): JsonResponse
    {
        $p = Product::where('id', $id)->where('is_deleted', false)->first();
        if (!$p) {
            return response()->json(['detail' => 'Product not found'], 404);
        }

        $p->is_deleted = true;
        $p->status = 'hidden';
        $p->save();

        try {
            AuditLog::create([
                'user_id' => auth()->id(),
                'action' => 'DELETE_PRODUCT',
                'details' => "Deleted product {$p->name}",
                'timestamp' => now()
            ]);
        } catch (\Throwable $e) {
            // Ignore audit log errors
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Product soft-deleted successfully'
        ]);
    }

    private function transformProduct($product): array
    {
        $stock_qty = $product->stock_quantity ?? 0;
        $low_stock_thr = $product->low_stock_threshold ?? 10;
        $is_out_of_stock = $stock_qty <= 0;
        
        $imageUrl = $product->image_url;
        if ($imageUrl && !str_starts_with($imageUrl, 'http')) {
            $imageUrl = rtrim(request()->getSchemeAndHttpHost(), '/') . '/' . ltrim($imageUrl, '/');
        }

        $images = is_array($product->images) ? $product->images : json_decode($product->images ?? '[]', true);
        $images = is_array($images) ? $images : [];
        $formattedImages = array_map(function($img) {
            if ($img && !str_starts_with($img, 'http')) {
                return rtrim(request()->getSchemeAndHttpHost(), '/') . '/' . ltrim($img, '/');
            }
            return $img;
        }, $images);

        $variants = is_array($product->variants) ? $product->variants : json_decode($product->variants ?? '[]', true);
        $features = is_array($product->features) ? $product->features : json_decode($product->features ?? '[]', true);
        $specifications = is_array($product->specifications) ? $product->specifications : json_decode($product->specifications ?? '{}', true);

        // Tags via pivot relationship
        try {
            $tagsCollection = $product->relationLoaded('tags') ? $product->getRelation('tags') : $product->tags()->get();
            $tags = $tagsCollection->map(fn($t) => ['id' => $t->id, 'name' => $t->name])->toArray();
            $tagIds = $tagsCollection->pluck('id')->toArray();
        } catch (\Exception $e) {
            $tags = [];
            $tagIds = [];
        }

        return [
            "id" => $product->id,
            "name" => $product->name,
            "description" => $product->description,
            "price" => (double)$product->price,
            "sale_price" => $product->sale_price ? (double)$product->sale_price : null,
            "tax_rate" => (double)$product->tax_rate,
            "stock" => $stock_qty,
            "stock_quantity" => $stock_qty,
            "stock_status" => $is_out_of_stock ? "out_of_stock" : "in_stock",
            "is_available" => $stock_qty > 0 && $product->is_active && $product->status == "active",
            "low_stock_threshold" => $low_stock_thr,
            "is_low_stock" => $stock_qty <= $low_stock_thr,
            "in_stock" => $stock_qty > 0,
            "quantity" => $stock_qty,
            "sku" => $product->sku,
            "category_id" => $product->category_id,
            "subcategory_id" => $product->subcategory_id,
            "brand" => $this->extractBrand($product->name),
            "category_name" => $product->category ? $product->category->name : "",
            "image" => $imageUrl,
            "image_url" => $imageUrl,
            "images" => $formattedImages,
            "variants" => $variants ?? [],
            "features" => $features ?? [],
            "specifications" => $specifications ?? new \stdClass(),
            "tags" => $tags ?? [],
            "tag_ids" => $tagIds,
            "seo_title" => $product->seo_title,
            "seo_description" => $product->seo_description,
            "slug" => $product->slug,
            "status" => $product->status,
            "created_at" => $product->created_at ? \Illuminate\Support\Carbon::parse($product->created_at)->toIso8601String() : null,
            "category" => $product->category ? [
                "id" => $product->category->id,
                "name" => $product->category->name,
                "description" => $product->category->description
            ] : null
        ];
    }

    private function extractBrand(string $name): string
    {
        $known_brands = [
            "موبيل 1", "موبيل", "كاسترول", "موتول", "يورل", "كيو", "امسويل", 
            "ليكوي مولي", "ليكويمولي", "فرام", "ميجوايرز", "تويوتا", "شل", "توتال"
        ];
        $name_lower = mb_strtolower($name, 'UTF-8');
        foreach ($known_brands as $brand) {
            if (mb_strpos($name_lower, $brand) !== false) {
                return $brand;
            }
        }
        $words = explode(' ', $name);
        $words = array_values(array_filter($words));
        $first_word = count($words) > 0 ? $words[0] : "أخرى";
        if (in_array($first_word, ["فلتر", "سائل", "شامبو", "منظف", "زيت"])) {
            if (count($words) > 2) {
                return $words[2];
            } elseif (count($words) > 1) {
                return $words[1];
            }
        }
        return $first_word;
    }
}
