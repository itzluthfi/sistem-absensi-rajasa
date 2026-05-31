<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseController;
use App\Models\AcademicPeriod;
use Illuminate\Http\Request;

class AcademicPeriodsController extends BaseController
{
    public function index()
    {
        try {
            $periods = AcademicPeriod::orderBy('id', 'desc')->get();
            return $this->sendResponse($periods);
        } catch (\Exception $e) {
            return $this->sendError('Gagal mengambil data periode akademik.');
        }
    }
}
