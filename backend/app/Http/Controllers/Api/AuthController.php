<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use App\Models\AuditLog;
use App\Models\Student;
use App\Models\Teacher;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Carbon\Carbon;

/**
 * Authentication Controller
 *
 * Handle login, register, logout, dan authentication related operations
 */
class AuthController extends BaseController
{
    /**
     * Login user
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function login(Request $request)
    {
        try {
            $request->validate([
                'email' => 'required|string',
                'password' => 'required|min:6',
            ]);

            $identifier = $request->email;

            // 1. Cari user berdasarkan email
            $user = User::where('email', $identifier)->first();

            // 2. Jika tidak ditemukan, cari berdasarkan NIS siswa
            if (!$user) {
                $student = Student::where('nis', $identifier)->first();
                if ($student) {
                    $user = $student->user;
                }
            }

            // 3. Jika tidak ditemukan, cari berdasarkan NIP guru
            if (!$user) {
                $teacher = Teacher::where('nip', $identifier)->first();
                if ($teacher) {
                    $user = $teacher->user;
                }
            }

            // 4. Jika tidak ditemukan, cari berdasarkan nama user / nama lengkap (Guru / Siswa)
            if (!$user) {
                $user = User::where('name', $identifier)->first();
            }
            if (!$user) {
                $teacher = Teacher::where('full_name', $identifier)->first();
                if ($teacher) {
                    $user = $teacher->user;
                }
            }
            if (!$user) {
                $student = Student::where('full_name', $identifier)->first();
                if ($student) {
                    $user = $student->user;
                }
            }

            if (!$user || !Hash::check($request->password, $user->password)) {
                // Log failed login attempt
                $this->logFailedLogin($request);
                return $this->sendError('Identitas atau kata sandi tidak cocok', [], 401);
            }

            if (isset($user->is_active) && !$user->is_active) {
                return $this->sendError('Akun pengguna belum aktif', [], 403);
            }

            $token = $user->createToken('auth_token')->plainTextToken;

            // Log successful login
            AuditLog::create([
                'user_id' => $user->id,
                'action' => AuditLog::ACTION_LOGIN,
                'description' => "User {$user->name} logged in successfully",
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            // Load additional user data
            $userData = [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar' => $user->avatar,
                'roles' => $user->getRoleNames(),
            ];

            // Add role-specific data
            if ($user->hasRole('siswa') && $user->student) {
                $userData['student_info'] = [
                    'id' => $user->student->id,
                    'nis' => $user->student->nis,
                    'class_id' => $user->student->class_id,
                    'class_name' => $user->student->class?->class_name,
                ];
            } elseif ($user->hasRole('guru') && $user->teacher) {
                $userData['teacher_info'] = [
                    'id' => $user->teacher->id,
                    'nip' => $user->teacher->nip,
                    'class_ids' => $user->teacher->classes->pluck('id')->toArray(),
                    'class_names' => $user->teacher->classes->pluck('class_name')->toArray(),
                    'teaching_class_names' => $user->teacher->schedules()
                        ->with('class')
                        ->get()
                        ->pluck('class.class_name')
                        ->filter()
                        ->unique()
                        ->values()
                        ->toArray(),
                ];
            }

            return $this->sendResponse([
                'user' => $userData,
                'token' => $token,
                'token_type' => 'Bearer',
            ], 'Berhasil masuk');
        } catch (ValidationException $e) {
            return $this->sendValidationError($e->errors());
        } catch (\Exception $e) {
            return $this->sendError('Terjadi kesalahan saat mencoba masuk. Silakan coba lagi.');
        }
    }

    /**
     * Register new user
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function register(Request $request)
    {
        try {
            $request->validate([
                'name' => 'required|string|max:255',
                'email' => 'required|email|unique:users',
                'password' => 'required|min:8|confirmed',
            ]);

            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'is_active' => true,
            ]);

            // Assign default role (siswa)
            $user->assignRole('siswa');

            $token = $user->createToken('auth_token')->plainTextToken;

            // Log registration
            AuditLog::create([
                'user_id' => $user->id,
                'action' => AuditLog::ACTION_CREATE,
                'description' => "New user registered: {$user->name}",
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'new_values' => ['name' => $user->name, 'email' => $user->email, 'role' => 'siswa'],
            ]);

            return $this->sendResponse([
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'roles' => $user->getRoleNames(),
                ],
                'token' => $token,
                'token_type' => 'Bearer',
            ], 'Pendaftaran berhasil', 201);
        } catch (ValidationException $e) {
            return $this->sendValidationError($e->errors());
        } catch (\Exception $e) {
            return $this->sendError('Terjadi kesalahan saat pendaftaran. Silakan coba lagi.');
        }
    }

    /**
     * Logout user
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function logout(Request $request)
    {
        $user = $request->user();

        // Log logout
        AuditLog::create([
            'user_id' => $user->id,
            'action' => AuditLog::ACTION_LOGOUT,
            'description' => "User {$user->name} logged out",
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        $request->user()->currentAccessToken()->delete();
        return $this->sendResponse([], 'Berhasil keluar');
    }

    /**
     * Get current authenticated user
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function me(Request $request)
    {
        $user = $request->user();
        $userData = [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'avatar' => $user->avatar,
            'roles' => $user->getRoleNames(),
            'permissions' => $user->getAllPermissions()->pluck('name'),
        ];

        // Add role-specific data
        if ($user->hasRole('siswa') && $user->student) {
            $userData['student_info'] = [
                'id' => $user->student->id,
                'nis' => $user->student->nis,
                'nisn' => $user->student->nisn,
                'class_id' => $user->student->class_id,
                'class_name' => $user->student->class?->class_name,
                'major_name' => $user->student->class?->major?->major_name,
            ];
        } elseif ($user->hasRole('guru') && $user->teacher) {
            $userData['teacher_info'] = [
                'id' => $user->teacher->id,
                'nip' => $user->teacher->nip,
                'class_ids' => $user->teacher->classes->pluck('id')->toArray(),
                'class_names' => $user->teacher->classes->pluck('class_name')->toArray(),
                'teaching_class_names' => $user->teacher->schedules()
                    ->with('class')
                    ->get()
                    ->pluck('class.class_name')
                    ->filter()
                    ->unique()
                    ->values()
                    ->toArray(),
            ];
        }

        return $this->sendResponse($userData);
    }

    /**
     * Refresh token
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function refreshToken(Request $request)
    {
        $user = $request->user();

        // Delete old token
        $request->user()->currentAccessToken()->delete();

        // Create new token
        $token = $user->createToken('auth_token')->plainTextToken;

        return $this->sendResponse([
            'token' => $token,
            'token_type' => 'Bearer',
        ], 'Token diperbarui');
    }

    /**
     * Change password of authenticated user
     */
    public function changePassword(Request $request)
    {
        try {
            $request->validate([
                'current_password' => 'required',
                'new_password' => 'required|min:6|confirmed',
            ]);

            $user = $request->user();

            if (!Hash::check($request->current_password, $user->password)) {
                return $this->sendError('Kata sandi saat ini salah', [], 400);
            }

            $user->password = Hash::make($request->new_password);
            $user->save();

            // Log password change
            AuditLog::create([
                'user_id' => $user->id,
                'action' => 'change_password',
                'description' => "User {$user->name} changed password successfully",
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            return $this->sendResponse([], 'Kata sandi berhasil diubah');
        } catch (ValidationException $e) {
            return $this->sendValidationError($e->errors());
        } catch (\Exception $e) {
            return $this->sendError('Gagal mengubah kata sandi');
        }
    }

    /**
     * Forgot password - Reset password to default
     */
    public function forgotPassword(Request $request)
    {
        try {
            $request->validate([
                'email' => 'required|email',
            ]);

            $user = User::where('email', $request->email)->first();

            if (!$user) {
                return $this->sendError('Alamat email tidak terdaftar di sistem', [], 404);
            }

            // Reset password to default
            $user->password = Hash::make('rajasa123');
            $user->save();

            // Log password reset
            AuditLog::create([
                'user_id' => $user->id,
                'action' => 'forgot_password_reset',
                'description' => "User {$user->name} password was reset to default via forgot password",
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            return $this->sendResponse([], 'Kata sandi berhasil disetel ulang menjadi default: rajasa123');
        } catch (ValidationException $e) {
            return $this->sendValidationError($e->errors());
        } catch (\Exception $e) {
            return $this->sendError('Gagal menyetel ulang kata sandi');
        }
    }

    /**
     * Register device token for push notifications
     */
    public function registerDeviceToken(Request $request)
    {
        try {
            $request->validate([
                'token' => 'required|string',
                'device_type' => 'nullable|string',
            ]);

            $user = $request->user();

            // Simpan atau update token perangkat
            $user->deviceTokens()->updateOrCreate(
                ['token' => $request->token],
                ['device_type' => $request->device_type]
            );

            return $this->sendResponse([], 'Device token registered successfully.');
        } catch (ValidationException $e) {
            return $this->sendValidationError($e->errors());
        } catch (\Exception $e) {
            return $this->sendError('Gagal mendaftarkan token perangkat: ' . $e->getMessage());
        }
    }

    /**
     * Log failed login attempt
     */
    private function logFailedLogin(Request $request)
    {
        $identifier = $request->email;

        // Try to find the user for logging
        $user = User::where('email', $identifier)->first();

        if (!$user) {
            $student = Student::where('nis', $identifier)->first();
            if ($student) {
                $user = $student->user;
            }
        }

        if (!$user) {
            $teacher = Teacher::where('nip', $identifier)->first();
            if ($teacher) {
                $user = $teacher->user;
            }
        }

        AuditLog::create([
            'user_id' => $user?->id,
            'action' => 'login_failed',
            'description' => $user
                ? "Failed login attempt for user: {$user->name} (wrong password)"
                : "Failed login attempt for identifier: {$identifier} (user not found)",
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'old_values' => ['identifier' => $identifier],
        ]);
    }
}