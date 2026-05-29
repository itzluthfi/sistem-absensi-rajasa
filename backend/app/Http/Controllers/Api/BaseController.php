<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Base API Controller
 * 
 * Provides common methods untuk API responses
 */
class BaseController extends Controller
{
    /**
     * Success Response
     */
    public function sendResponse($data, $message = 'Berhasil', $code = 200)
    {
        return response()->json([
            'success' => true,
            'data' => $data,
            'message' => $message,
        ], $code);
    }

    /**
     * Error Response
     */
    public function sendError($message = 'Terjadi kesalahan', $errors = [], $code = 400)
    {
        return response()->json([
            'success' => false,
            'message' => $message,
            'errors' => $errors,
        ], $code);
    }

    /**
     * Validation Error Response
     */
    public function sendValidationError($errors)
    {
        return response()->json([
            'success' => false,
            'message' => 'Terjadi kesalahan validasi',
            'errors' => $errors,
        ], Response::HTTP_UNPROCESSABLE_ENTITY);
    }
}
