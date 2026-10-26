<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\AuditLog;
use App\Helpers\JWTHelper;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    /**
     * Authenticate user and issue access token.
     */
    public function login(Request $request)
    {
        $username = $request->input('username');
        $password = $request->input('password');

        if (!$username || !$password) {
            return response()->json(['detail' => 'Username and password are required'], 400);
        }

        $user = User::where('email', $username)->orWhere('phone', $username)->first();

        if (!$user || !password_verify($password, $user->hashed_password ?? $user->password)) {
            return response()->json(['detail' => 'Incorrect email or password'], 401);
        }

        if (!$user->is_active) {
            return response()->json(['detail' => 'Inactive user account'], 400);
        }

        // Create JWT token (valid for 7 days)
        $token = JWTHelper::encode([
            'sub' => $user->email ?? $user->phone,
            'exp' => time() + (60 * 60 * 24 * 7)
        ]);

        // Create audit log
        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'USER_LOGIN',
            'details' => "User " . ($user->email ?? $user->phone) . " logged in successfully",
            'timestamp' => now()
        ]);

        // Update last_login_at
        $user->last_login_at = now();
        $user->save();

        return response()->json([
            'access_token' => $token,
            'token_type' => 'bearer'
        ]);
    }

    /**
     * Get authenticated user profile.
     */
    public function me(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['detail' => 'Could not validate credentials'], 401);
        }

        $formatted = [
            'id' => $user->id,
            'email' => $user->email,
            'phone' => $user->phone,
            'name' => $user->name ?: $user->full_name,
            'full_name' => $user->full_name ?: $user->name,
            'role' => $user->role ?? 'admin',
            'is_active' => (bool)$user->is_active,
            'avatar_url' => $user->avatar_url,
            'total_orders' => (int)($user->total_orders ?? 0),
            'total_spent' => (float)($user->total_spent ?? 0.0),
            'created_at' => $user->created_at ? \Carbon\Carbon::parse($user->created_at)->toIso8601String() : null
        ];

        return response()->json(array_merge($formatted, [
            'success' => true,
            'data' => $formatted
        ]));
    }

    /**
     * API: Update profile
     */
    public function updateProfile(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'User not found'], 404);
        }

        $request->validate([
            'name' => 'nullable|string|max:255',
            'avatar_url' => 'nullable|string|max:1000',
        ]);

        if ($request->has('name')) {
            $user->name = $request->name;
            $user->full_name = $request->name;
        }

        if ($request->has('avatar_url')) {
            $user->avatar_url = $request->avatar_url;
        }

        $user->save();

        $formatted = [
            'id' => $user->id,
            'name' => $user->name,
            'full_name' => $user->full_name,
            'avatar_url' => $user->avatar_url,
        ];

        return response()->json([
            'success' => true,
            'message' => 'تم تحديث الملف الشخصي بنجاح',
            'data' => $formatted
        ]);
    }

    /**
     * API: Logout
     */
    public function logout(Request $request)
    {
        return response()->json([
            'success' => true,
            'message' => 'تم تسجيل الخروج بنجاح'
        ]);
    }
}
