<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Filament\Models\Contracts\FilamentUser;
use Filament\Panel;


use Spatie\Permission\Traits\HasRoles;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'full_name', 'email', 'password', 'hashed_password', 'phone', 'avatar', 'avatar_url', 'is_admin', 'role', 'is_active'])]
#[Hidden(['password', 'remember_token', 'hashed_password'])]
class User extends Authenticatable implements FilamentUser

{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, HasRoles;

    /**
     * Override Spatie's bootHasRoles method to prevent errors on delete,
     * as Spatie pivot tables (model_has_roles, model_has_permissions) do not exist in this database.
     */
    public static function bootHasRoles(): void
    {
        // Do nothing to avoid detaching roles/permissions on delete
    }

    /**
     * Override Spatie's bootHasPermissions method to prevent errors on delete,
     * as Spatie pivot tables do not exist in this database.
     */
    public static function bootHasPermissions(): void
    {
        // Do nothing to avoid detaching permissions on delete
    }

    /**
     * Get the password for the user.
     */
    public function getAuthPassword()
    {
        return $this->hashed_password ?? $this->password;
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_admin' => 'boolean',
        ];
    }

    /**
     * Determine if the user is an admin.
     */
    public function getIsAdminAttribute(): bool
    {
        return in_array($this->role, ['superadmin', 'admin']);
    }

    public function canAccessPanel(Panel $panel): bool
    {
        return $this->is_admin || $this->hasRole('super_admin');
    }

    public function getAvatarUrlAttribute(): ?string
    {
        return $this->attributes['avatar_url'] ?? $this->attributes['avatar'] ?? null;
    }

    public function addresses()
    {
        return $this->hasMany(UserAddress::class);
    }

    public function reviews()
    {
        return $this->hasMany(ProductReview::class);
    }
}


