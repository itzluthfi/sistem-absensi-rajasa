<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseController;
use App\Models\User;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UsersController extends BaseController
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        try {
            $query = User::with('roles');

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%");
                });
            }

            if ($request->filled('role')) {
                $query->role($request->role);
            }

            $users = $query->paginate(15);

            return $this->sendResponse($users);
        } catch (\Exception $e) {
            return $this->sendError('Gagal mengambil data user: ' . $e->getMessage());
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        try {
            $request->validate([
                'name' => 'required|string|max:255',
                'email' => 'required|email|unique:users,email',
                'password' => 'required|string|min:6',
                'role' => 'required|string|exists:roles,name',
                'is_active' => 'nullable|boolean'
            ]);

            DB::beginTransaction();

            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'is_active' => $request->input('is_active', true)
            ]);

            $user->assignRole($request->role);

            // Audit Log
            DB::table('audit_logs')->insert([
                'user_id' => $request->user()->id,
                'action' => AuditLog::ACTION_CREATE,
                'description' => "Membuat user baru #{$user->id} ({$user->name}) dengan peran {$request->role}",
                'model_type' => User::class,
                'model_id' => $user->id,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::commit();

            return $this->sendResponse($user->load('roles'), 'User berhasil dibuat', 201);
        } catch (ValidationException $e) {
            DB::rollBack();
            return $this->sendValidationError($e->errors());
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Gagal membuat user: ' . $e->getMessage());
        }
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        try {
            $user = User::with(['roles', 'student', 'teacher'])->find($id);

            if (!$user) {
                return $this->sendError('User tidak ditemukan', [], 404);
            }

            return $this->sendResponse($user);
        } catch (\Exception $e) {
            return $this->sendError('Gagal mengambil detail user: ' . $e->getMessage());
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        try {
            $user = User::findOrFail($id);

            $request->validate([
                'name' => 'required|string|max:255',
                'email' => 'required|email|unique:users,email,' . $id,
                'password' => 'nullable|string|min:6',
                'role' => 'required|string|exists:roles,name',
                'is_active' => 'required|boolean'
            ]);

            DB::beginTransaction();

            $user->name = $request->name;
            $user->email = $request->email;
            if ($request->filled('password')) {
                $user->password = Hash::make($request->password);
            }
            $user->is_active = $request->is_active;
            $user->save();

            $user->syncRoles([$request->role]);

            // Audit Log
            DB::table('audit_logs')->insert([
                'user_id' => $request->user()->id,
                'action' => AuditLog::ACTION_UPDATE,
                'description' => "Memperbarui data user #{$user->id} ({$user->name})",
                'model_type' => User::class,
                'model_id' => $user->id,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::commit();

            return $this->sendResponse($user->load('roles'), 'User berhasil diperbarui');
        } catch (ValidationException $e) {
            DB::rollBack();
            return $this->sendValidationError($e->errors());
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Gagal memperbarui user: ' . $e->getMessage());
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, $id)
    {
        try {
            $user = User::findOrFail($id);

            if ($user->id === $request->user()->id) {
                return $this->sendError('Anda tidak dapat menghapus akun Anda sendiri.');
            }

            DB::beginTransaction();

            // Store name for description before delete
            $userName = $user->name;

            // Delete user Spatie roles association is handled automatically by Spatie's HasRoles trait on cascade/delete, but we delete just to be safe
            $user->syncRoles([]);
            $user->delete();

            // Audit Log
            DB::table('audit_logs')->insert([
                'user_id' => $request->user()->id,
                'action' => AuditLog::ACTION_DELETE,
                'description' => "Menghapus user #{$id} ({$userName})",
                'model_type' => User::class,
                'model_id' => $id,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::commit();

            return $this->sendResponse(null, 'User berhasil dihapus');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Gagal menghapus user: ' . $e->getMessage());
        }
    }
}
