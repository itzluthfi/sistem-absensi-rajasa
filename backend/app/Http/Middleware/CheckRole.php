<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Spatie\Permission\Models\Role;

class CheckRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  ...$roles
     */
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Silakan login terlebih dahulu.',
            ], 401);
        }

        // Check if user has any of the required roles
        $userRoles = $user->getRoleNames()->toArray();

        foreach ($roles as $role) {
            if (in_array($role, $userRoles)) {
                return $next($request);
            }
        }

        return response()->json([
            'success' => false,
            'message' => 'Akses ditolak. Anda tidak memiliki hak akses yang diperlukan.',
        ], 403);
    }
}

/**
 * Middleware untuk check permission (granular access)
 */
class CheckPermission
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  ...$permissions
     */
    public function handle(Request $request, Closure $next, ...$permissions): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Silakan login terlebih dahulu.',
            ], 401);
        }

        // Check if user has any of the required permissions
        // Super Admin automatically has all permissions
        if ($user->hasRole('super_admin')) {
            return $next($request);
        }

        // Check permissions
        foreach ($permissions as $permission) {
            if ($user->hasPermissionTo($permission)) {
                return $next($request);
            }
        }

        return response()->json([
            'success' => false,
            'message' => 'Akses ditolak. Anda tidak memiliki izin yang diperlukan.',
        ], 403);
    }
}

/**
 * Middleware untuk check role AND permission
 */
class CheckRoleAndPermission
{
    public function handle(Request $request, Closure $next, $roles = null, $permissions = null): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Silakan login terlebih dahulu.',
            ], 401);
        }

        // Parse roles and permissions
        $requiredRoles = $roles ? explode(',', $roles) : [];
        $requiredPermissions = $permissions ? explode(',', $permissions) : [];

        // Check if user has required role
        if (!empty($requiredRoles)) {
            $userRoles = $user->getRoleNames()->toArray();
            $hasRole = false;
            foreach ($requiredRoles as $role) {
                if (in_array(trim($role), $userRoles)) {
                    $hasRole = true;
                    break;
                }
            }
            if (!$hasRole && !$user->hasRole('super_admin')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Akses ditolak. Role tidak sesuai.',
                ], 403);
            }
        }

        // Check if user has required permission
        if (!empty($requiredPermissions)) {
            $hasPermission = false;
            foreach ($requiredPermissions as $permission) {
                if ($user->hasPermissionTo(trim($permission))) {
                    $hasPermission = true;
                    break;
                }
            }
            if (!$hasPermission && !$user->hasRole('super_admin')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Akses ditolak. Izin tidak mencukupi.',
                ], 403);
            }
        }

        return $next($request);
    }
}