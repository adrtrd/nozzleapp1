<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use App\Models\AuditLog;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class CategoryController extends Controller
{
    /**
     * Ensure required columns exist on the categories table across SQLite/MySQL.
     */
    private function ensureSchema(): void
    {
        try {
            if (!Schema::hasTable('categories')) {
                return;
            }
            Schema::table('categories', function (Blueprint $table) {
                if (!Schema::hasColumn('categories', 'parent_id')) {
                    $table->unsignedBigInteger('parent_id')->nullable();
                }
                if (!Schema::hasColumn('categories', 'description')) {
                    $table->text('description')->nullable();
                }
                if (!Schema::hasColumn('categories', 'icon_url')) {
                    $table->string('icon_url', 1000)->nullable();
                }
                if (!Schema::hasColumn('categories', 'image_url')) {
                    $table->string('image_url', 1000)->nullable();
                }
                if (!Schema::hasColumn('categories', 'sort_order')) {
                    $table->integer('sort_order')->default(0);
                }
                if (!Schema::hasColumn('categories', 'seo_title')) {
                    $table->string('seo_title', 255)->nullable();
                }
                if (!Schema::hasColumn('categories', 'seo_description')) {
                    $table->text('seo_description')->nullable();
                }
                if (!Schema::hasColumn('categories', 'slug')) {
                    $table->string('slug', 255)->nullable();
                }
                if (!Schema::hasColumn('categories', 'is_active')) {
                    $table->boolean('is_active')->default(true);
                }
            });
        } catch (\Throwable $e) {
            // Ignore schema alter errors if permissions or locks prevent it
        }
    }

    /**
     * Display a listing of categories.
     */
    public function index(Request $request): JsonResponse
    {
        $this->ensureSchema();

        $parentId = $request->input('parent_id');
        $parentOnly = $request->boolean('parent_only', false);
        $includeChildren = $request->has('include_children')
            ? $request->boolean('include_children')
            : true;

        $hasIsDeleted = Schema::hasTable('products') && Schema::hasColumn('products', 'is_deleted');

        $query = Category::withCount(['products' => function ($q) use ($hasIsDeleted) {
            if ($hasIsDeleted) {
                $q->where('is_deleted', false);
            }
        }]);

        if (Schema::hasColumn('categories', 'sort_order')) {
            $query->orderBy('sort_order');
        } elseif (Schema::hasColumn('categories', 'order_index')) {
            $query->orderBy('order_index');
        }

        if ($parentId !== null && $parentId !== '') {
            $query->where('parent_id', $parentId);
        } elseif ($parentOnly) {
            $query->whereNull('parent_id');
        } else {
            // Default behavior if neither is specified: get parent categories
            $query->whereNull('parent_id');
        }

        $categories = $query->get()->map(function ($category) use ($includeChildren) {
            return $this->transformCategory($category, $includeChildren);
        });

        return response()->json([
            'status' => 'success',
            'success' => true,
            'data' => $categories
        ]);
    }

    /**
     * Display the specified category.
     */
    public function show($id): JsonResponse
    {
        $this->ensureSchema();

        $hasIsDeleted = Schema::hasTable('products') && Schema::hasColumn('products', 'is_deleted');

        $category = Category::withCount(['products' => function ($q) use ($hasIsDeleted) {
            if ($hasIsDeleted) {
                $q->where('is_deleted', false);
            }
        }])->find($id);

        if (!$category) {
            return response()->json([
                'status' => 'error',
                'message' => 'القسم غير موجود',
                'detail' => 'Category not found'
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'success' => true,
            'data' => $this->transformCategory($category, true)
        ]);
    }

    /**
     * Store a newly created category.
     */
    public function store(Request $request): JsonResponse
    {
        $this->ensureSchema();

        $request->validate([
            'name' => 'required|string|max:255',
        ]);

        try {
            $name = trim($request->input('name'));
            $rawParentId = $request->input('parent_id');
            $parentId = ($rawParentId === '' || $rawParentId === null || $rawParentId === 'null' || $rawParentId === 0 || $rawParentId === '0')
                ? null
                : (int)$rawParentId;

            $rawSlug = $request->input('slug') ?: $name;
            $slug = $this->generateUniqueSlug($rawSlug);

            $columns = Schema::getColumnListing('categories');
            $hasCol = fn(string $col) => in_array($col, $columns, true);

            $cat = new Category();
            $cat->name = $name;
            if ($hasCol('name_ar')) {
                $cat->name_ar = $request->input('name_ar') ?: $name;
            }
            if ($hasCol('description')) {
                $cat->description = $request->input('description');
            }
            if ($hasCol('description_ar')) {
                $cat->description_ar = $request->input('description_ar') ?: $request->input('description');
            }
            if ($hasCol('parent_id')) {
                $cat->parent_id = $parentId;
            }
            if ($hasCol('icon_url')) {
                $cat->icon_url = $request->input('icon_url');
            }
            if ($hasCol('icon')) {
                $cat->icon = $request->input('icon_url') ?: $request->input('icon');
            }
            if ($hasCol('image_url')) {
                $cat->image_url = $request->input('image_url');
            }
            if ($hasCol('image')) {
                $cat->image = $request->input('image_url') ?: $request->input('image');
            }
            if ($hasCol('sort_order')) {
                $cat->sort_order = (int)$request->input('sort_order', 0);
            }
            if ($hasCol('order_index')) {
                $cat->order_index = (int)$request->input('sort_order', 0);
            }
            if ($hasCol('seo_title')) {
                $cat->seo_title = $request->input('seo_title');
            }
            if ($hasCol('seo_description')) {
                $cat->seo_description = $request->input('seo_description');
            }
            if ($hasCol('slug')) {
                $cat->slug = $slug;
            }
            if ($hasCol('is_active')) {
                $cat->is_active = $request->boolean('is_active', true);
            }
            if ($hasCol('home_banner_url') && $request->has('home_banner_url')) {
                $cat->home_banner_url = $request->input('home_banner_url');
            }
            if ($hasCol('home_banner_position') && $request->has('home_banner_position')) {
                $cat->home_banner_position = $request->input('home_banner_position', 'hide');
            }
            if ($hasCol('department_id')) {
                if ($request->filled('department_id')) {
                    $cat->department_id = (int)$request->input('department_id');
                } elseif ($parentId !== null) {
                    $parentCat = Category::find($parentId);
                    if ($parentCat && isset($parentCat->department_id)) {
                        $cat->department_id = $parentCat->department_id ?: $parentCat->id;
                    }
                }
            }

            $cat->save();

            // If root category and department_id column exists and is null, set to self id if appropriate
            if ($hasCol('department_id') && $cat->parent_id === null && empty($cat->department_id)) {
                try {
                    $cat->department_id = $cat->id;
                    $cat->save();
                } catch (\Throwable $e) {
                    // Ignore if department_id has a foreign key to another table
                }
            }

            try {
                if (Schema::hasTable('audit_logs')) {
                    AuditLog::create([
                        'user_id' => auth()->id(),
                        'action' => 'CREATE_CATEGORY',
                        'details' => "Created category {$cat->name}",
                        'timestamp' => now()
                    ]);
                }
            } catch (\Throwable $e) {
                // Do not fail category creation if audit log fails
            }

            return response()->json([
                'status' => 'success',
                'success' => true,
                'data' => $this->transformCategory($cat, true)
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'حدث خطأ أثناء حفظ القسم: ' . $e->getMessage(),
                'detail' => 'حدث خطأ أثناء حفظ القسم: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update the specified category.
     */
    public function update(Request $request, $id): JsonResponse
    {
        $this->ensureSchema();

        $cat = Category::find($id);
        if (!$cat) {
            return response()->json([
                'status' => 'error',
                'message' => 'القسم غير موجود',
                'detail' => 'Category not found'
            ], 404);
        }

        try {
            $columns = Schema::getColumnListing('categories');
            $hasCol = fn(string $col) => in_array($col, $columns, true);

            if ($request->has('name')) {
                $cat->name = trim($request->input('name'));
                if ($hasCol('name_ar')) {
                    $cat->name_ar = $request->input('name_ar') ?: $cat->name;
                }
            }
            if ($request->has('description') && $hasCol('description')) {
                $cat->description = $request->input('description');
            }
            if ($request->has('parent_id') && $hasCol('parent_id')) {
                $rawParentId = $request->input('parent_id');
                $parentId = ($rawParentId === '' || $rawParentId === null || $rawParentId === 'null' || $rawParentId === 0 || $rawParentId === '0')
                    ? null
                    : (int)$rawParentId;
                if ($parentId !== (int)$cat->id) {
                    $cat->parent_id = $parentId;
                }
            }
            if ($request->has('icon_url')) {
                if ($hasCol('icon_url')) {
                    $cat->icon_url = $request->input('icon_url');
                }
                if ($hasCol('icon')) {
                    $cat->icon = $request->input('icon_url');
                }
            }
            if ($request->has('image_url')) {
                if ($hasCol('image_url')) {
                    $cat->image_url = $request->input('image_url');
                }
                if ($hasCol('image')) {
                    $cat->image = $request->input('image_url');
                }
            }
            if ($request->has('sort_order')) {
                if ($hasCol('sort_order')) {
                    $cat->sort_order = (int)$request->input('sort_order');
                }
                if ($hasCol('order_index')) {
                    $cat->order_index = (int)$request->input('sort_order');
                }
            }
            if ($request->has('seo_title') && $hasCol('seo_title')) {
                $cat->seo_title = $request->input('seo_title');
            }
            if ($request->has('seo_description') && $hasCol('seo_description')) {
                $cat->seo_description = $request->input('seo_description');
            }
            if ($hasCol('slug')) {
                if ($request->has('slug')) {
                    $rawSlug = $request->input('slug') ?: $cat->name;
                    $cat->slug = $this->generateUniqueSlug($rawSlug, $id);
                } elseif ($request->has('name') && empty($cat->slug)) {
                    $cat->slug = $this->generateUniqueSlug($cat->name, $id);
                }
            }
            if ($request->has('is_active') && $hasCol('is_active')) {
                $cat->is_active = $request->boolean('is_active');
            }
            if ($request->has('home_banner_url') && $hasCol('home_banner_url')) {
                $cat->home_banner_url = $request->input('home_banner_url');
            }
            if ($request->has('home_banner_position') && $hasCol('home_banner_position')) {
                $cat->home_banner_position = $request->input('home_banner_position');
            }

            $cat->save();

            try {
                if (Schema::hasTable('audit_logs')) {
                    AuditLog::create([
                        'user_id' => auth()->id(),
                        'action' => 'UPDATE_CATEGORY',
                        'details' => "Updated category {$cat->name}",
                        'timestamp' => now()
                    ]);
                }
            } catch (\Throwable $e) {
                // Ignore audit log errors
            }

            return response()->json([
                'status' => 'success',
                'success' => true,
                'data' => $this->transformCategory($cat, true)
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'حدث خطأ أثناء تعديل القسم: ' . $e->getMessage(),
                'detail' => 'حدث خطأ أثناء تعديل القسم: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Reorder categories.
     */
    public function reorder(Request $request): JsonResponse
    {
        $this->ensureSchema();

        $sortData = $request->all(); // List of [id => ..., sort_order => ...]
        $hasSortOrder = Schema::hasColumn('categories', 'sort_order');
        $hasOrderIndex = Schema::hasColumn('categories', 'order_index');

        foreach ($sortData as $item) {
            if (!is_array($item)) {
                continue;
            }
            $catId = $item['id'] ?? null;
            $newOrder = $item['sort_order'] ?? null;
            if ($catId !== null && $newOrder !== null) {
                $updates = [];
                if ($hasSortOrder) {
                    $updates['sort_order'] = (int)$newOrder;
                }
                if ($hasOrderIndex) {
                    $updates['order_index'] = (int)$newOrder;
                }
                if (!empty($updates)) {
                    Category::where('id', $catId)->update($updates);
                }
            }
        }

        return response()->json([
            'status' => 'success',
            'success' => true,
            'message' => 'Category sorting updated successfully'
        ]);
    }

    /**
     * Delete the specified category.
     */
    public function destroy($id): JsonResponse
    {
        $cat = Category::find($id);
        if (!$cat) {
            return response()->json([
                'status' => 'error',
                'message' => 'القسم غير موجود',
                'detail' => 'Category not found'
            ], 404);
        }

        $categoryName = $cat->name;
        // Also delete child categories explicitly if foreign key cascade is not active
        Category::where('parent_id', $cat->id)->delete();
        $cat->delete();

        try {
            if (Schema::hasTable('audit_logs')) {
                AuditLog::create([
                    'user_id' => auth()->id(),
                    'action' => 'DELETE_CATEGORY',
                    'details' => "Deleted category {$categoryName}",
                    'timestamp' => now()
                ]);
            }
        } catch (\Throwable $e) {
            // Ignore audit log errors
        }

        return response()->json([
            'status' => 'success',
            'success' => true,
            'message' => 'Category deleted successfully'
        ]);
    }

    private function formatAssetUrl(?string $url): ?string
    {
        if (!$url) {
            return null;
        }
        if (str_starts_with($url, 'http://') || str_starts_with($url, 'https://')) {
            return $url;
        }
        return rtrim(request()->getSchemeAndHttpHost(), '/') . '/' . ltrim($url, '/');
    }

    private function countCategoryProducts($category): int
    {
        try {
            if (!Schema::hasTable('products')) {
                return 0;
            }
            $hasIsDeleted = Schema::hasColumn('products', 'is_deleted');
            $hasSubcategoryId = Schema::hasColumn('products', 'subcategory_id');

            $query = Product::query();
            if ($hasIsDeleted) {
                $query->where('is_deleted', false);
            }
            $query->where(function ($q) use ($category, $hasSubcategoryId) {
                $q->where('category_id', $category->id);
                if ($hasSubcategoryId) {
                    $q->orWhere('subcategory_id', $category->id);
                }
            });
            return $query->count();
        } catch (\Throwable $e) {
            return (int)($category->products_count ?? 0);
        }
    }

    private function transformCategory($category, $includeChildren = false): array
    {
        $rawImageUrl = $category->image_url ?? $category->image ?? null;
        $rawIconUrl = $category->icon_url ?? $category->icon ?? null;

        $imageUrl = $this->formatAssetUrl($rawImageUrl);
        $iconUrl = $this->formatAssetUrl($rawIconUrl);
        $productCount = $this->countCategoryProducts($category);

        $data = [
            'id' => $category->id,
            'name' => $category->name,
            'description' => $category->description,
            'parent_id' => $category->parent_id,
            'department_id' => $category->department_id ?? $category->parent_id ?? $category->id,
            'icon_url' => $iconUrl,
            'image_url' => $imageUrl,
            'home_banner_url' => isset($category->home_banner_url) ? $this->formatAssetUrl($category->home_banner_url) : null,
            'home_banner_position' => $category->home_banner_position ?? 'hide',
            'sort_order' => (int)($category->sort_order ?? $category->order_index ?? 0),
            'seo_title' => $category->seo_title ?? null,
            'seo_description' => $category->seo_description ?? null,
            'slug' => $category->slug,
            'is_active' => (bool)($category->is_active ?? true),
            'created_at' => $category->created_at ? \Illuminate\Support\Carbon::parse($category->created_at)->toIso8601String() : null,
            'product_count' => $productCount,
            'products_count' => $productCount,
        ];

        if ($includeChildren) {
            $subCategoriesData = $category->subCategories->map(function ($sub) {
                return $this->transformCategory($sub, false);
            })->toArray();

            $data['sub_categories'] = $subCategoriesData;
            $data['subcategories'] = $subCategoriesData;
        }

        return $data;
    }

    private function generateUniqueSlug(string $input, $excludeId = null): string
    {
        $slug = preg_replace('/[^a-z0-9\x{0600}-\x{06FF}]+/u', '-', mb_strtolower(trim($input)));
        $slug = trim($slug, '-');
        if (empty($slug)) {
            $slug = Str::slug($input);
        }
        if (empty($slug)) {
            $slug = 'category-' . time();
        }

        if (!Schema::hasColumn('categories', 'slug')) {
            return $slug;
        }

        $originalSlug = $slug;
        $i = 1;
        while (true) {
            $query = Category::where('slug', $slug);
            if ($excludeId !== null) {
                $query->where('id', '!=', $excludeId);
            }
            if (!$query->exists()) {
                break;
            }
            $slug = $originalSlug . '-' . $i;
            $i++;
        }
        return $slug;
    }
}

