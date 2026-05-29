<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class QRController extends Controller
{
    public function studentQr($studentId)
    {
        try {
            $payload = json_encode(['student_id' => $studentId]);
            $png = QrCode::format('png')->size(300)->generate($payload);
            return response($png)->header('Content-Type', 'image/png');
        } catch (\Exception $e) {
            return (new BaseController)->sendError('Gagal membuat QR code.');
        }
    }
}
