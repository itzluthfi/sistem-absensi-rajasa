<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;

class GenericExport implements FromCollection, WithHeadings, ShouldAutoSize
{
    protected $collection;
    protected $headings;

    /**
     * GenericExport Constructor
     *
     * @param \Illuminate\Support\Collection $collection
     * @param array $headings
     */
    public function __construct($collection, array $headings)
    {
        $this->collection = $collection;
        $this->headings = $headings;
    }

    /**
     * Return collection to export
     *
     * @return \Illuminate\Support\Collection
     */
    public function collection()
    {
        return $this->collection;
    }

    /**
     * Return headings
     *
     * @return array
     */
    public function headings(): array
    {
        return $this->headings;
    }
}
