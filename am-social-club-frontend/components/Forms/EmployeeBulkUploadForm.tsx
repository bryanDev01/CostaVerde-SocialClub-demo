'use client'

import { useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileUp,
  Loader2,
  Upload,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { FormAlert } from '@/components/Common/FormAlert'
import { useEmployeeActions } from '@/lib/hooks'
import { describeApiError } from '@/lib/errorMessages'
import {
  EMPLOYEE_CSV_TEMPLATE,
  parseEmployeeCsv,
  parseEmployeeExcelRows,
  type SpreadsheetCell,
} from '@/lib/csv'
import { cn } from '@/lib/utils'
import type { EmployeeUploadResult } from '@/lib/types'

type InputMode = 'paste' | 'file'

const PREVIEW_LIMIT = 8

const ACCEPTED_EXTENSIONS = '.csv,.txt,.xlsx,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

function ResultPanel({ result, onReset }: { result: EmployeeUploadResult; onReset: () => void }) {
  const hasErrors = result.errors.length > 0
  const allFailed = result.imported === 0 && result.total > 0

  return (
    <div className="space-y-6">
      <div
        className={cn(
          'flex items-start gap-3 rounded-2xl border p-5',
          allFailed ? 'border-danger/20 bg-danger/5' : 'border-primary/20 bg-primary/5'
        )}
      >
        {allFailed ? (
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
        ) : (
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        )}
        <div>
          <p
            className={cn(
              'text-sm font-semibold',
              allFailed ? 'text-danger' : 'text-primary'
            )}
          >
            {allFailed
              ? 'No se importó ningún empleado'
              : `Precarga completada: ${result.imported} de ${result.total}`}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {result.imported > 0
              ? `${result.imported} ${
                  result.imported === 1 ? 'empleado importado' : 'empleados importados'
                } correctamente. Los empleados ya pueden registrarse validando su CI.`
              : 'Revisa los errores por línea y corrige el archivo antes de reintentar.'}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Total
          </p>
          <p className="mt-1.5 font-display text-2xl font-semibold text-foreground">
            {result.total}
          </p>
        </div>
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
            Importados
          </p>
          <p className="mt-1.5 font-display text-2xl font-semibold text-primary">
            {result.imported}
          </p>
        </div>
        <div
          className={cn(
            'rounded-xl border p-4 text-center',
            hasErrors ? 'border-danger/20 bg-danger/5' : 'border-border bg-card'
          )}
        >
          <p
            className={cn(
              'text-[10px] font-semibold uppercase tracking-[0.16em]',
              hasErrors ? 'text-danger' : 'text-muted-foreground'
            )}
          >
            Con errores
          </p>
          <p
            className={cn(
              'mt-1.5 font-display text-2xl font-semibold',
              hasErrors ? 'text-danger' : 'text-foreground'
            )}
          >
            {result.errors.length}
          </p>
        </div>
      </div>

      {hasErrors ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <p className="border-b border-border bg-muted/50 px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Detalle de errores
          </p>
          <ul className="max-h-72 overflow-y-auto">
            {result.errors.map((error, index) => (
              <li
                key={`${error.row}-${index}`}
                className="flex items-start gap-3 border-b border-border px-5 py-3 text-sm last:border-b-0"
              >
                <span className="shrink-0 rounded-md bg-danger/10 px-2 py-0.5 font-mono text-xs font-semibold text-danger">
                  Línea {error.row}
                </span>
                <span className="text-muted-foreground">{error.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button className="h-11" onClick={onReset}>
          Cargar otro archivo
        </Button>
      </div>
    </div>
  )
}

export function EmployeeBulkUploadForm() {
  const { bulkUpload } = useEmployeeActions()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<InputMode>('paste')
  const [csvText, setCsvText] = useState('')
  const [excelRows, setExcelRows] = useState<SpreadsheetCell[][] | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [parsingFile, setParsingFile] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [result, setResult] = useState<EmployeeUploadResult | null>(null)

  const parsed = useMemo(() => {
    if (mode === 'paste') {
      if (!csvText.trim()) return null
      return parseEmployeeCsv(csvText)
    }

    if (!fileName) return null
    if (excelRows) return parseEmployeeExcelRows(excelRows)
    if (csvText.trim()) return parseEmployeeCsv(csvText)
    return null
  }, [mode, csvText, excelRows, fileName])

  const handleModeChange = (nextMode: InputMode) => {
    if (nextMode === mode) return
    setMode(nextMode)
    setSubmitError(null)
    setResult(null)

    if (nextMode === 'paste') {
      setExcelRows(null)
      setFileName(null)
    }
  }

  const handleDownloadTemplate = () => {
    const blob = new Blob([EMPLOYEE_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'plantilla-empleados.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const readFile = async (file: File) => {
    const lowerName = file.name.toLowerCase()

    if (lowerName.endsWith('.xls')) {
      toast.error(
        'El formato antiguo .xls no está soportado. Abre el archivo en Excel y guárdalo como .xlsx.'
      )
      return
    }

    const isExcel = lowerName.endsWith('.xlsx')
    const isCsv = lowerName.endsWith('.csv') || lowerName.endsWith('.txt')

    if (!isExcel && !isCsv) {
      toast.error('Formato no soportado. Usa un archivo .csv, .txt o .xlsx')
      return
    }

    setSubmitError(null)
    setResult(null)

    if (isExcel) {
      setParsingFile(true)
      try {
        const { readSheet } = await import('read-excel-file/browser')
        const rows = await readSheet(file)
        setExcelRows(rows as unknown as SpreadsheetCell[][])
        setCsvText('')
        setFileName(file.name)
        setMode('file')
      } catch {
        toast.error(
          'No se pudo leer el archivo Excel. Verifica que no esté dañado o protegido.'
        )
      } finally {
        setParsingFile(false)
      }
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setCsvText(String(reader.result ?? ''))
      setExcelRows(null)
      setFileName(file.name)
      setMode('file')
      setSubmitError(null)
      setResult(null)
    }
    reader.onerror = () => toast.error('No se pudo leer el archivo')
    reader.readAsText(file, 'UTF-8')
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragActive(false)
    const file = event.dataTransfer.files?.[0]
    if (file) void readFile(file)
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) void readFile(file)
    event.target.value = ''
  }

  const handleReset = () => {
    setCsvText('')
    setExcelRows(null)
    setFileName(null)
    setResult(null)
    setSubmitError(null)
  }

  const handleSubmit = async () => {
    if (!parsed || parsed.rows.length === 0) return

    setSubmitting(true)
    setSubmitError(null)
    try {
      const uploadResult = await bulkUpload(parsed.rows)
      setResult(uploadResult)
      if (uploadResult.imported > 0) {
        toast.success(`${uploadResult.imported} empleados precargados correctamente.`)
      }
    } catch (error) {
      setSubmitError(
        describeApiError(error, 'No se pudo procesar la precarga')
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    return <ResultPanel result={result} onReset={handleReset} />
  }

  const previewRows = parsed?.rows.slice(0, PREVIEW_LIMIT) ?? []
  const parseErrors = parsed?.errors ?? []
  const canSubmit = parsed !== null && parsed.rows.length > 0 && !submitting && !parsingFile
  const hasFile = mode === 'file' && fileName !== null

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="inline-flex rounded-xl border border-border bg-muted/60 p-1"
          role="group"
          aria-label="Método de carga"
        >
          <button
            type="button"
            onClick={() => handleModeChange('paste')}
            aria-pressed={mode === 'paste'}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50',
              mode === 'paste'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-background hover:text-foreground'
            )}
          >
            <FileSpreadsheet className="size-4" aria-hidden />
            Pegar CSV
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('file')}
            aria-pressed={mode === 'file'}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50',
              mode === 'file'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-background hover:text-foreground'
            )}
          >
            <FileUp className="size-4" aria-hidden />
            Subir archivo
          </button>
        </div>

        <Button variant="outline" className="h-11 bg-background" onClick={handleDownloadTemplate}>
          <Download className="size-4" aria-hidden />
          Descargar plantilla CSV
        </Button>
      </div>

      {mode === 'paste' ? (
        <div className="space-y-2">
          <label
            htmlFor="csv-input"
            className="text-sm font-medium text-foreground"
          >
            Contenido CSV
          </label>
          <Textarea
            id="csv-input"
            placeholder={`ci,nombre,empresa,correo,telefono\n85010112345,Juan Pérez,Ministerio...,juan@correo.cu,+53 5555 1234`}
            className="min-h-44 font-mono text-sm"
            value={csvText}
            onChange={(event) => {
              setCsvText(event.target.value)
              setExcelRows(null)
              setFileName(null)
              setSubmitError(null)
            }}
            disabled={submitting}
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Formato: CI, nombre, empresa, correo (opcional), teléfono (opcional).
            Se acepta coma o punto y coma como separador.
          </p>
        </div>
      ) : (
        <div
          onDragOver={(event) => {
            event.preventDefault()
            setDragActive(true)
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={cn(
            'rounded-2xl border-2 border-dashed p-10 text-center transition-colors',
            dragActive
              ? 'border-primary bg-primary/5'
              : 'border-border bg-muted/30'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            className="sr-only"
            onChange={handleFileChange}
            aria-label="Seleccionar archivo CSV o Excel"
          />

          {parsingFile ? (
            <div className="flex flex-col items-center">
              <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
              <p className="mt-4 text-sm font-semibold text-foreground">
                Leyendo archivo Excel...
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Estamos procesando tus filas, un momento.
              </p>
            </div>
          ) : hasFile ? (
            <div className="flex flex-col items-center">
              <span className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
                <FileSpreadsheet className="size-6" aria-hidden />
              </span>
              <p className="mt-4 text-sm font-semibold text-foreground">{fileName}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {parsed?.rows.length ?? 0} filas válidas detectadas
              </p>
              <Button
                variant="ghost"
                className="mt-3 h-9 text-muted-foreground"
                onClick={handleReset}
                disabled={submitting}
              >
                <X className="size-4" aria-hidden />
                Quitar archivo
              </Button>
            </div>
          ) : (
            <>
              <span className="mx-auto grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
                <Upload className="size-6" aria-hidden />
              </span>
              <p className="mt-4 text-sm font-semibold text-foreground">
                Arrastra tu archivo CSV o Excel aquí
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                o selecciónalo desde tu equipo (.csv, .txt o .xlsx, hasta 2000 filas)
              </p>
              <Button
                variant="outline"
                className="mt-5 h-11 bg-background"
                onClick={() => fileInputRef.current?.click()}
                disabled={submitting}
              >
                Seleccionar archivo
              </Button>
            </>
          )}
        </div>
      )}

      {parsed ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              <CheckCircle2 className="size-3.5" aria-hidden />
              {parsed.rows.length} {parsed.rows.length === 1 ? 'fila válida' : 'filas válidas'}
            </span>
            {parseErrors.length > 0 ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-danger/20 bg-danger/5 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-danger">
                <AlertTriangle className="size-3.5" aria-hidden />
                {parseErrors.length} {parseErrors.length === 1 ? 'error' : 'errores'}
              </span>
            ) : null}
          </div>

          {previewRows.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <p className="border-b border-border bg-muted/50 px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Vista previa ({previewRows.length} de {parsed.rows.length})
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                      <th className="px-5 py-2.5 font-semibold">CI</th>
                      <th className="px-5 py-2.5 font-semibold">Nombre</th>
                      <th className="hidden px-5 py-2.5 font-semibold sm:table-cell">
                        Empresa
                      </th>
                      <th className="hidden px-5 py-2.5 font-semibold md:table-cell">
                        Correo
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, index) => (
                      <tr key={`${row.ci}-${index}`} className="border-b border-border last:border-b-0">
                        <td className="px-5 py-3 font-mono text-xs text-foreground">
                          {row.ci}
                        </td>
                        <td className="px-5 py-3 font-medium text-foreground">
                          {row.name}
                        </td>
                        <td className="hidden px-5 py-3 text-muted-foreground sm:table-cell">
                          {row.company}
                        </td>
                        <td className="hidden px-5 py-3 text-muted-foreground md:table-cell">
                          {row.email ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {parseErrors.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-danger/20 bg-danger/5">
              <p className="border-b border-danger/10 px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-danger">
                Líneas con errores (no se importarán)
              </p>
              <ul className="max-h-48 overflow-y-auto">
                {parseErrors.map((error, index) => (
                  <li
                    key={`${error.line}-${index}`}
                    className="flex items-start gap-3 px-5 py-2.5 text-sm"
                  >
                    <span className="shrink-0 rounded-md bg-danger/10 px-2 py-0.5 font-mono text-xs font-semibold text-danger">
                      Línea {error.line}
                    </span>
                    <span className="text-danger/90">{error.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {submitError ? <FormAlert>{submitError}</FormAlert> : null}

      <div className="flex flex-wrap items-center gap-4">
        <Button
          className="h-12 px-7 text-[15px] font-semibold"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Procesando precarga...
            </>
          ) : (
            <>
              <Upload className="size-4" aria-hidden />
              Precargar {parsed?.rows.length ?? 0}{' '}
              {parsed?.rows.length === 1 ? 'empleado' : 'empleados'}
            </>
          )}
        </Button>
        {parsed && parseErrors.length > 0 && parsed.rows.length > 0 ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Las líneas con errores se omitirán; el resto se importará normalmente.
          </p>
        ) : null}
      </div>
    </div>
  )
}
