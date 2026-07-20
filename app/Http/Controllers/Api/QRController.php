<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use SimpleSoftwareIO\QrCode\Facades\QrCode;
use App\Models\Student;
use App\Models\SchoolClass;

class QRController extends Controller
{
    public function studentQr($studentId)
    {
        try {
            $payload = json_encode(['student_id' => (int)$studentId]);
            $png = QrCode::format('png')->size(300)->margin(2)->generate($payload);
            return response($png)->header('Content-Type', 'image/png');
        } catch (\Exception $e) {
            return (new BaseController)->sendError('Gagal membuat QR code.');
        }
    }

    public function classQr($classId)
    {
        try {
            $payload = json_encode(['class_id' => (int)$classId]);
            $png = QrCode::format('png')->size(300)->margin(2)->generate($payload);
            return response($png)->header('Content-Type', 'image/png');
        } catch (\Exception $e) {
            return (new BaseController)->sendError('Gagal membuat QR code.');
        }
    }

    public function myQr(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user || !$user->student) {
                return (new BaseController)->sendError('Siswa tidak ditemukan.', [], 404);
            }
            $payload = json_encode(['student_id' => (int)$user->student->id]);
            $png = QrCode::format('png')->size(300)->margin(2)->generate($payload);
            return response($png)->header('Content-Type', 'image/png');
        } catch (\Exception $e) {
            return (new BaseController)->sendError('Gagal membuat QR code.');
        }
    }

    public function sessionQr(Request $request)
    {
        try {
            $sessionId = $request->query('session_id') ?? $request->input('session_id');
            $qrToken = $request->query('qr_token') ?? $request->input('qr_token');

            if (!$sessionId || !$qrToken) {
                return (new BaseController)->sendError('Parameter session_id dan qr_token diperlukan.', [], 400);
            }

            $payload = json_encode([
                'session_id' => (int)$sessionId,
                'qr_token' => $qrToken,
            ]);

            $png = QrCode::format('png')->size(500)->margin(2)->generate($payload);
            return response($png)->header('Content-Type', 'image/png');
        } catch (\Exception $e) {
            return (new BaseController)->sendError('Gagal membuat QR code.');
        }
    }
}
