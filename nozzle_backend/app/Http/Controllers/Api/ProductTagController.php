<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductTag;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

class ProductTagController extends Controller
{
    /**
     * Ensure product_tags and product_tag_items tables and columns exist.
     */
    private function ensureSchema(): void
    {
        try {
            if (!Schema::hasTable('product_tags')) {
                Schema::create('product_tags', function (Blueprint $table) {
                    $table->id();
                    $table->string('name');
                    $table->unsignedBigInteger('subcategory_id');
                    $table->unsignedBigInteger('parent_id')->nullable();
                    $table->string('image_url', 1000)->nullable();
                    $table->string('icon_emoji', 50)->nullable();
                    $table->integer('sort_order')->default(0);
                    $table->boolean('is_active')->default(true);
                    $table->timestamp('created_at')->nullable();
                    $table->timestamp('updated_at')->nullable();
                });
            } else {
                Schema::table('product_tags', function (Blueprint $table) {
                    if (!Schema::hasColumn('product_tags', 'parent_id')) {
                        $table->unsignedBigInteger('parent_id')->nullable();
                    }
                    if (!Schema::hasColumn('product_tags', 'image_url')) {
                        $table->string('image_url', 1000)->nullable();
                    }
                    if (!Schema::hasColumn('product_tags', 'icon_emoji')) {
                        $table->string('icon_emoji', 50)->nullable();
                    }
                    if (!Schema::hasColumn('product_tags', 'sort_order')) {
                        $table->integer('sort_order')->default(0);
                    }
                    if (!Schema::hasColumn('product_tags', 'is_active')) {
                        $table->boolean('is_active')->default(true);
                    }
                    if (!Schema::hasColumn('product_tags', 'created_at')) {
                        $table->timestamp('created_at')->nullable();
                    }
                });
            }

            if (!Schema::hasTable('product_tag_items')) {
                Schema::create('product_tag_items', function (Blueprint $table) {
                    $table->unsignedBigInteger('product_id');
                    $table->unsignedBigInteger('tag_id');
                    $table->primary(['product_id', 'tag_id']);
                });
            }
        } catch (\Throwable $e) {
            // Ignore schema errors if already up to date
        }
    }

    private function formatImageUrl(?string $url): ?string
    {
        if (!$url) {
            return null;
        }
        if (str_starts_with($url, 'http://') || str_starts_with($url, 'https://')) {
            return $url;
        }
        $clean = ltrim($url, '/');
        if (str_starts_with($clean, 'static/') || str_starts_with($clean, 'storage/')) {
            return rtrim(request()->getSchemeAndHttpHost(), '/') . '/' . $clean;
        }
        return asset('storage/' . $clean);
    }

    private function transformTag(ProductTag $tag, $allTags = null): array
    {
        $productsCount = 0;
        try {
            $productsCount = $tag->products()->count();
        } catch (\Throwable $e) {
            $productsCount = 0;
        }

        $data = [
            'id' => $tag->id,
            'name' => $tag->name,
            'subcategory_id' => (int)$tag->subcategory_id,
            'parent_id' => $tag->parent_id ? (int)$tag->parent_id : null,
            'image_url' => $this->formatImageUrl($tag->image_url),
            'icon_emoji' => $tag->icon_emoji,
            'sort_order' => (int)($tag->sort_order ?? 0),
            'is_active' => (bool)$tag->is_active,
            'products_count' => $productsCount,
        ];

        if (!$tag->parent_id) {
            if ($allTags !== null) {
                $subTags = $allTags
                    ->where('parent_id', $tag->id)
                    ->sortBy('sort_order')
                    ->values()
                    ->map(fn($sub) => $this->transformTag($sub, null))
                    ->toArray();
            } else {
                $subTags = $tag->subTags()
                    ->orderBy('sort_order')
                    ->get()
                    ->map(fn($sub) => $this->transformTag($sub, null))
                    ->toArray();
            }
            $data['sub_tags'] = $subTags;
        }

        return $data;
    }

    /**
     * Display a listing of product tags.
     */
    public function index(Request $request): JsonResponse
    {
        $this->ensureSchema();

        $query = ProductTag::query();

        if ($request->filled('subcategory_id')) {
            $subId = (int)$request->subcategory_id;
            $childCategoryIds = [];
            if (Schema::hasTable('categories') && Schema::hasColumn('categories', 'parent_id')) {
                $childCategoryIds = Category::where('parent_id', $subId)->pluck('id')->toArray();
            }
            if (!empty($childCategoryIds) && !$request->boolean('strict_subcategory', false)) {
                $query->whereIn('subcategory_id', array_merge([$subId], $childCategoryIds));
            } else {
                $query->where('subcategory_id', $subId);
            }
        }

        if ($request->has('is_active')) {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        $allMatchingTags = $query->orderBy('sort_order')->get();

        if ($request->boolean('top_level_only', false)) {
            $tags = $allMatchingTags
                ->filter(fn($t) => empty($t->parent_id))
                ->values()
                ->map(fn($tag) => $this->transformTag($tag, $allMatchingTags));
        } else {
            $tags = $allMatchingTags->map(fn($tag) => $this->transformTag($tag, $allMatchingTags));
        }

        return response()->json([
            'success' => true,
            'status' => 'success',
            'data' => $tags
        ]);
    }

    /**
     * Store a newly created product tag.
     */
    public function store(Request $request): JsonResponse
    {
        $this->ensureSchema();

        $rawParentId = $request->input('parent_id');
        $parentId = ($rawParentId === '' || $rawParentId === null || $rawParentId === 'null' || $rawParentId === 0 || $rawParentId === '0')
            ? null
            : (int)$rawParentId;

        $request->merge([
            'parent_id' => $parentId,
        ]);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'subcategory_id' => 'required|integer|exists:categories,id',
            'parent_id' => 'nullable|integer|exists:product_tags,id',
            'image_url' => 'nullable|string',
            'icon_emoji' => 'nullable|string',
            'sort_order' => 'nullable|integer',
        ]);

        try {
            if ($request->hasFile('image')) {
                $path = $request->file('image')->store('product_tags', 'public');
                $validated['image_url'] = $path;
            }

            $columns = Schema::getColumnListing('product_tags');
            $hasCol = fn(string $col) => in_array($col, $columns, true);

            $tagData = [
                'name' => trim($validated['name']),
                'subcategory_id' => (int)$validated['subcategory_id'],
                'image_url' => $validated['image_url'] ?? null,
                'icon_emoji' => $validated['icon_emoji'] ?? null,
                'sort_order' => (int)($validated['sort_order'] ?? 0),
                'is_active' => $request->has('is_active')
                    ? filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN)
                    : true,
            ];

            if ($hasCol('parent_id')) {
                $tagData['parent_id'] = $parentId;
            }

            $tag = ProductTag::create($tagData);

            $rawProductIds = $request->input('product_ids');
            if (is_string($rawProductIds)) {
                $rawProductIds = json_decode($rawProductIds, true);
            }
            if (is_array($rawProductIds) && !empty($rawProductIds)) {
                $validProductIds = Product::whereIn('id', $rawProductIds)->pluck('id')->toArray();
                $tag->products()->sync($validProductIds);
            }

            return response()->json([
                'success' => true,
                'status' => 'success',
                'message' => 'تم إنشاء التصنيف بنجاح',
                'data' => $this->transformTag($tag)
            ], 201);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'status' => 'error',
                'message' => 'حدث خطأ أثناء حفظ التصنيف: ' . $e->getMessage(),
                'detail' => 'حدث خطأ أثناء حفظ التصنيف: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Display the specified product tag.
     */
    public function show($id): JsonResponse
    {
        $this->ensureSchema();

        $tag = ProductTag::findOrFail($id);

        $productIds = [];
        try {
            $productIds = $tag->products()->pluck('products.id')->toArray();
        } catch (\Throwable $e) {
            $productIds = [];
        }

        $data = $this->transformTag($tag);
        $data['product_ids'] = $productIds;
        $data['products_count'] = count($productIds);

        return response()->json([
            'success' => true,
            'status' => 'success',
            'data' => $data
        ]);
    }

    /**
     * Update the specified product tag.
     */
    public function update(Request $request, $id): JsonResponse
    {
        $this->ensureSchema();

        $tag = ProductTag::findOrFail($id);

        if ($request->has('parent_id')) {
            $rawParentId = $request->input('parent_id');
            $parentId = ($rawParentId === '' || $rawParentId === null || $rawParentId === 'null' || $rawParentId === 0 || $rawParentId === '0')
                ? null
                : (int)$rawParentId;
            $request->merge(['parent_id' => $parentId]);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'subcategory_id' => 'sometimes|required|integer|exists:categories,id',
            'parent_id' => 'nullable|integer|exists:product_tags,id',
            'image_url' => 'nullable|string',
            'icon_emoji' => 'nullable|string',
            'sort_order' => 'nullable|integer',
        ]);

        try {
            if ($request->hasFile('image')) {
                if ($tag->image_url && !str_starts_with($tag->image_url, 'http')) {
                    Storage::disk('public')->delete($tag->image_url);
                }
                $path = $request->file('image')->store('product_tags', 'public');
                $validated['image_url'] = $path;
            }

            if ($request->input('clear_image') === 'true' || $request->input('clear_image') === true) {
                if ($tag->image_url && !str_starts_with($tag->image_url, 'http')) {
                    Storage::disk('public')->delete($tag->image_url);
                }
                $tag->image_url = null;
            }

            $columns = Schema::getColumnListing('product_tags');
            $hasCol = fn(string $col) => in_array($col, $columns, true);

            $updateData = [
                'name' => isset($validated['name']) ? trim($validated['name']) : $tag->name,
                'subcategory_id' => isset($validated['subcategory_id']) ? (int)$validated['subcategory_id'] : $tag->subcategory_id,
                'image_url' => $request->has('image_url') ? $validated['image_url'] : ($validated['image_url'] ?? $tag->image_url),
                'icon_emoji' => $request->has('icon_emoji') ? $validated['icon_emoji'] : $tag->icon_emoji,
                'sort_order' => isset($validated['sort_order']) ? (int)$validated['sort_order'] : $tag->sort_order,
                'is_active' => $request->has('is_active')
                    ? filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN)
                    : $tag->is_active,
            ];

            if ($hasCol('parent_id') && $request->has('parent_id')) {
                $updateData['parent_id'] = $validated['parent_id'] ?? null;
            }

            $tag->update($updateData);

            if ($request->has('product_ids')) {
                $rawProductIds = $request->input('product_ids');
                if (is_string($rawProductIds)) {
                    $rawProductIds = json_decode($rawProductIds, true);
                }
                if (is_array($rawProductIds)) {
                    $validProductIds = Product::whereIn('id', $rawProductIds)->pluck('id')->toArray();
                    $tag->products()->sync($validProductIds);
                }
            }

            return response()->json([
                'success' => true,
                'status' => 'success',
                'message' => 'تم تعديل التصنيف بنجاح',
                'data' => $this->transformTag($tag)
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'status' => 'error',
                'message' => 'حدث خطأ أثناء تعديل التصنيف: ' . $e->getMessage(),
                'detail' => 'حدث خطأ أثناء تعديل التصنيف: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Remove the specified product tag.
     */
    public function destroy($id): JsonResponse
    {
        $this->ensureSchema();

        $tag = ProductTag::findOrFail($id);

        if ($tag->image_url && !str_starts_with($tag->image_url, 'http')) {
            Storage::disk('public')->delete($tag->image_url);
        }

        try {
            $tag->products()->detach();
        } catch (\Throwable $e) {
            // Ignore detach error
        }

        // Also delete child sub-tags
        ProductTag::where('parent_id', $tag->id)->delete();
        $tag->delete();

        return response()->json([
            'success' => true,
            'status' => 'success',
            'message' => 'تم حذف التصنيف بنجاح'
        ]);
    }
}

