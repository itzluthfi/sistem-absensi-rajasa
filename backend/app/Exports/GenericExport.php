<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class GenericExport implements FromCollection, WithHeadings, ShouldAutoSize, WithStyles
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

    /**
     * Style the worksheet
     *
     * @param Worksheet $sheet
     * @return array
     */
    public function styles(Worksheet $sheet)
    {
        // Explicitly enable auto-sizing for columns A through G to ensure auto-fit works
        foreach (range('A', 'G') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        return [
            1 => [
                'font' => [
                    'bold' => true,
                    'color' => ['argb' => 'FFFFFFFF'],
                ],
                'fill' => [
                    'fillType' => 'solid',
                    'startColor' => [
                        'argb' => 'FF2563EB', // Deep blue background
                    ],
                ],
            ],
        ];
    }
}
