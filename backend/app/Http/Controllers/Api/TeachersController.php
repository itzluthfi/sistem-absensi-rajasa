<?php
 
namespace App\Http\Controllers\Api;
 
use App\Http\Controllers\Api\BaseController;
use App\Models\Teacher;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;
 
class TeachersController extends BaseController
{
    public function index()
    {
        try {
            $paginator = DB::table('teachers as t')
                ->join('users as u', 't.user_id', '=', 'u.id')
                ->select(
                    't.id',
                    't.user_id',
                    't.nip',
                    't.full_name',
                    't.gender',
                    't.phone',
                    't.address',
                    't.photo',
                    't.created_at',
                    't.updated_at',
                    'u.name as user_name',
                    'u.email as user_email'
                )
                ->paginate(15);
 
            // Transform the collection items inside the paginator to match nested Eloquent structure
            $paginator->getCollection()->transform(function ($item) {
                $mapped = new \stdClass();
                $mapped->id = $item->id;
                $mapped->user_id = $item->user_id;
                $mapped->nip = $item->nip;
                $mapped->full_name = $item->full_name;
                $mapped->gender = $item->gender;
                $mapped->phone = $item->phone;
                $mapped->address = $item->address;
                $mapped->photo = $item->photo;
                $mapped->created_at = $item->created_at;
                $mapped->updated_at = $item->updated_at;
 
                $mapped->user = new \stdClass();
                $mapped->user->id = $item->user_id;
                $mapped->user->name = $item->user_name;
                $mapped->user->email = $item->user_email;
 
                return $mapped;
            });
 
            return $this->sendResponse($paginator);
        } catch (\Exception $e) {
            return $this->sendError('Gagal mengambil data guru. Silakan coba lagi.');
        }
    }
 
    public function show($id)
    {
        try {
            $teacher = DB::table('teachers as t')
                ->join('users as u', 't.user_id', '=', 'u.id')
                ->select(
                    't.id',
                    't.user_id',
                    't.nip',
                    't.full_name',
                    't.gender',
                    't.phone',
                    't.address',
                    't.photo',
                    't.created_at',
                    't.updated_at',
                    'u.name as user_name',
                    'u.email as user_email'
                )
                ->where('t.id', $id)
                ->first();
 
            if (!$teacher) return $this->sendError('Guru tidak ditemukan', [], 404);
 
            $classes = DB::table('classes')
                ->where('homeroom_teacher_id', $id)
                ->get();
 
            $mapped = new \stdClass();
            $mapped->id = $teacher->id;
            $mapped->user_id = $teacher->user_id;
            $mapped->nip = $teacher->nip;
            $mapped->full_name = $teacher->full_name;
            $mapped->gender = $teacher->gender;
            $mapped->phone = $teacher->phone;
            $mapped->address = $teacher->address;
            $mapped->photo = $teacher->photo;
            $mapped->created_at = $teacher->created_at;
            $mapped->updated_at = $teacher->updated_at;
 
            $mapped->user = new \stdClass();
            $mapped->user->id = $teacher->user_id;
            $mapped->user->name = $teacher->user_name;
            $mapped->user->email = $teacher->user_email;
 
            $mapped->classes = $classes;
 
            return $this->sendResponse($mapped);
        } catch (\Exception $e) {
            return $this->sendError('Gagal mengambil data guru. Silakan coba lagi.');
        }
    }
 
    public function store(Request $request)
    {
        try {
            $data = $request->validate([
                'user_id' => 'required|exists:users,id',
                'nip' => 'nullable|string',
                'full_name' => 'required|string|max:255',
                'gender' => 'nullable|string',
                'phone' => 'nullable|string',
                'address' => 'nullable|string',
            ]);
 
            $data['created_at'] = now();
            $data['updated_at'] = now();
 
            $teacherId = DB::table('teachers')->insertGetId($data);
 
            // Audit Log
            DB::table('audit_logs')->insert([
                'user_id' => $request->user()->id,
                'action' => AuditLog::ACTION_CREATE,
                'description' => "Created teacher #{$teacherId} ({$data['full_name']})",
                'model_type' => Teacher::class,
                'model_id' => $teacherId,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
 
            $teacher = DB::table('teachers')->where('id', $teacherId)->first();
            return $this->sendResponse($teacher, 'Guru berhasil dibuat', 201);
        } catch (ValidationException $e) {
            return $this->sendValidationError($e->errors());
        } catch (\Exception $e) {
            return $this->sendError('Gagal membuat guru. Silakan coba lagi.');
        }
    }
 
    public function update(Request $request, $id)
    {
        try {
            $teacher = DB::table('teachers')->where('id', $id)->first();
            if (!$teacher) return $this->sendError('Guru tidak ditemukan', [], 404);
 
            $data = $request->validate([
                'nip' => 'nullable|string',
                'full_name' => 'sometimes|string|max:255',
                'gender' => 'nullable|string',
                'phone' => 'nullable|string',
                'address' => 'nullable|string',
            ]);
 
            $data['updated_at'] = now();
 
            DB::table('teachers')->where('id', $id)->update($data);
 
            // Audit Log
            DB::table('audit_logs')->insert([
                'user_id' => $request->user()->id,
                'action' => AuditLog::ACTION_UPDATE,
                'description' => "Updated teacher #{$id}",
                'model_type' => Teacher::class,
                'model_id' => $id,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
 
            $updatedTeacher = DB::table('teachers')->where('id', $id)->first();
            return $this->sendResponse($updatedTeacher, 'Guru diperbarui');
        } catch (ValidationException $e) {
            return $this->sendValidationError($e->errors());
        } catch (\Exception $e) {
            return $this->sendError('Gagal memperbarui data guru. Silakan coba lagi.');
        }
    }
 
    public function destroy(Request $request, $id)
    {
        try {
            $teacher = DB::table('teachers')->where('id', $id)->first();
            if (!$teacher) return $this->sendError('Guru tidak ditemukan', [], 404);
 
            DB::table('teachers')->where('id', $id)->delete();
 
            // Audit Log
            DB::table('audit_logs')->insert([
                'user_id' => $request->user()->id,
                'action' => AuditLog::ACTION_DELETE,
                'description' => "Deleted teacher #{$id}",
                'model_type' => Teacher::class,
                'model_id' => $id,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
 
            return $this->sendResponse([], 'Guru dihapus');
        } catch (\Exception $e) {
            return $this->sendError('Gagal menghapus guru. Silakan coba lagi.');
        }
    }
}
