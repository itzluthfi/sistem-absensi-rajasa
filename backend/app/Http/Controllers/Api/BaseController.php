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
        $messages = [];
        if (is_array($errors) || $errors instanceof \Illuminate\Support\MessageBag) {
            foreach ($errors as $field => $errs) {
                if (is_array($errs)) {
                    foreach ($errs as $err) {
                        $messages[] = $err;
                    }
                } else {
                    $messages[] = $errs;
                }
            }
        }
        $message = !empty($messages) ? implode(' ', $messages) : 'Terjadi kesalahan validasi';

        return response()->json([
            'success' => false,
            'message' => $message,
            'errors' => $errors,
        ], Response::HTTP_UNPROCESSABLE_ENTITY);
    }
}
