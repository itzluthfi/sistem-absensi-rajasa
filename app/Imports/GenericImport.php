<?php

namespace App\Imports;

use Maatwebsite\Excel\Concerns\ToArray;

class GenericImport implements ToArray
{
    /**
     * Parse excel sheet to array
     *
     * @param array $array
     * @return array
     */
    public function array(array $array)
    {
        return $array;
    }
}
