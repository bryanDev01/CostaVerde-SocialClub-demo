'use client'

import { useState } from 'react'
import type { FileChild } from 'docx'
import { FileDown, FileSpreadsheet, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { BRAND } from '@/lib/branding'

export type ReportCell = string | number | boolean | null | undefined

export interface ReportSection {
  title: string
  columns: string[]
  rows: ReportCell[][]
}

interface ReportExportsProps {
  title: string
  filename: string
  sections: ReportSection[]
  disabled?: boolean
  loadSections?: () => Promise<ReportSection[]>
}

function formatCell(value: ReportCell): string {
  return value === null || value === undefined ? '—' : String(value)
}

function safeFilename(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '')
}

function safeSheetName(value: string, index: number): string {
  const name = value.replace(/[\\/?*:[\]]/g, ' ').trim().slice(0, 31)
  return name || `Reporte ${index + 1}`
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

async function exportExcel(title: string, filename: string, sections: ReportSection[]): Promise<void> {
  const ExcelJS = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  workbook.creator = BRAND.name
  workbook.created = new Date()

  sections.forEach((section, index) => {
    const worksheet = workbook.addWorksheet(safeSheetName(section.title, index))
    worksheet.columns = section.columns.map((column, columnIndex) => ({
      header: column,
      key: `column${columnIndex + 1}`,
      width: Math.min(Math.max(column.length + 4, 14), 36),
    }))
    worksheet.getRow(1).font = { bold: true }
    for (const row of section.rows) {
      worksheet.addRow(row.map((value) => {
        if (typeof value !== 'string') return value ?? ''
        return /^[=+\-@]/.test(value) ? `'${value}` : value
      }))
    }
    worksheet.views = [{ state: 'frozen', ySplit: 1 }]
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: Math.max(section.rows.length + 1, 1), column: section.columns.length },
    }
  })

  const buffer = await workbook.xlsx.writeBuffer()
  download(
    new Blob([new Uint8Array(buffer)], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `${safeFilename(filename)}.xlsx`
  )
}

async function exportWord(title: string, filename: string, sections: ReportSection[]): Promise<void> {
  const { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow } = await import('docx')
  const children: FileChild[] = [
    new Paragraph({ text: title, heading: HeadingLevel.TITLE }),
  ]

  sections.forEach((section) => {
    children.push(new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_1 }))
    const rows = [section.columns, ...section.rows.map((row) => row.map(formatCell))]
    children.push(new Table({
      rows: rows.map((row, rowIndex) => new TableRow({
        children: row.map((cell) => new TableCell({
          children: [new Paragraph({ text: cell })],
          ...(rowIndex === 0 ? { shading: { fill: 'E9EFFA' } } : {}),
        })),
      })),
    }))
  })

  const blob = await Packer.toBlob(new Document({ sections: [{ children }] }))
  download(blob, `${safeFilename(filename)}.docx`)
}

async function exportPdf(title: string, filename: string, sections: ReportSection[]): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default
  const pdf = new jsPDF({ orientation: 'landscape' })
  pdf.setFontSize(16)
  pdf.text(title, 14, 16)

  sections.forEach((section, index) => {
    if (index > 0) pdf.addPage()
    pdf.setFontSize(11)
    pdf.text(section.title, 14, 23)
    autoTable(pdf, {
      head: [section.columns],
      body: section.rows.map((row) => row.map(formatCell)),
      startY: 28,
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [14, 122, 61] },
      margin: { left: 14, right: 14 },
    })
  })

  download(pdf.output('blob'), `${safeFilename(filename)}.pdf`)
}

export function ReportExports({
  title,
  filename,
  sections,
  disabled = false,
  loadSections,
}: ReportExportsProps) {
  const [exporting, setExporting] = useState(false)
  const hasData = sections.some((section) => section.rows.length > 0)

  const handleExport = async (format: 'xlsx' | 'docx' | 'pdf') => {
    setExporting(true)
    try {
      const reportSections = loadSections ? await loadSections() : sections
      if (format === 'xlsx') await exportExcel(title, filename, reportSections)
      if (format === 'docx') await exportWord(title, filename, reportSections)
      if (format === 'pdf') await exportPdf(title, filename, reportSections)
    } catch {
      toast.error('No se pudo generar el archivo del informe.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="grid w-full grid-cols-3 items-center gap-2 sm:flex sm:w-auto" aria-label="Descargar informe">
      <Button size="sm" variant="outline" className="h-10 w-full min-w-[5.25rem] justify-center gap-1.5 whitespace-nowrap bg-background px-2 sm:w-auto sm:min-w-24" disabled={disabled || !hasData || exporting} onClick={() => void handleExport('docx')}>
        <FileText className="size-4 shrink-0" aria-hidden />
        DOCX
      </Button>
      <Button size="sm" variant="outline" className="h-10 w-full min-w-[5.25rem] justify-center gap-1.5 whitespace-nowrap bg-background px-2 sm:w-auto sm:min-w-24" disabled={disabled || !hasData || exporting} onClick={() => void handleExport('xlsx')}>
        <FileSpreadsheet className="size-4 shrink-0" aria-hidden />
        Excel
      </Button>
      <Button size="sm" variant="outline" className="h-10 w-full min-w-[5.25rem] justify-center gap-1.5 whitespace-nowrap bg-background px-2 sm:w-auto sm:min-w-24" disabled={disabled || !hasData || exporting} onClick={() => void handleExport('pdf')}>
        <FileDown className="size-4 shrink-0" aria-hidden />
        PDF
      </Button>
    </div>
  )
}