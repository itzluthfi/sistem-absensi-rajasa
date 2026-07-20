<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use App\Models\User;

class RoleController extends Controller
{
    public function index()
    {
        try {
            $roles = Role::with('permissions')->get();
            return (new BaseController)->sendResponse($roles);
        } catch (\Exception $e) {
            return (new BaseController)->sendError('Gagal mengambil daftar role.');
        }
    }

    public function store(Request $request)
    {
        $request->validate(['name' => 'required|string|unique:roles,name']);
        try {
            $role = Role::create(['name' => $request->name]);
            return (new BaseController)->sendResponse($role, 'Role berhasil dibuat', 201);
        } catch (\Exception $e) {
            return (new BaseController)->sendError('Gagal membuat role.');
        }
    }

    public function assignRole(Request $request)
    {
        $request->validate(['user_id' => 'required|exists:users,id', 'role' => 'required|string|exists:roles,name']);
        try {
            $user = User::find($request->user_id);
            $user->assignRole($request->role);
            return (new BaseController)->sendResponse($user, 'Role berhasil diberikan');
        } catch (\Exception $e) {
            return (new BaseController)->sendError('Gagal memberikan role.');
        }
    }

    public function givePermissionToRole(Request $request)
    {
        $request->validate(['role' => 'required|string|exists:roles,name', 'permission' => 'required|string']);
        try {
            $role = Role::findByName($request->role);
            $permission = Permission::firstOrCreate(['name' => $request->permission]);
            $role->givePermissionTo($permission);
            return (new BaseController)->sendResponse($role->load('permissions'), 'Permission berhasil ditambahkan ke role');
        } catch (\Exception $e) {
            return (new BaseController)->sendError('Gagal menambahkan permission.');
        }
    }
}
