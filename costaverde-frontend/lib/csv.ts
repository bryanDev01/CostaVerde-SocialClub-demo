import type { EmployeeUploadRow } from './types'

export interface CsvParseResult {
  rows: EmployeeUploadRow[]
  errors: Array<{ line: number; reason: string }>
}

export type SpreadsheetCell = string | number | boolean | Date | null | undefined

const EXPECTED_HEADERS = ['ci', 'name', 'company', 'email', 'phone']

const HEADER_ALIASES: Record<string, string> = {
  ci: 'ci',
  'carnet': 'ci',
  'carnet de identidad': 'ci',
  nombre: 'name',
  'nombre y apellidos': 'name',
  'nombre completo': 'name',
  name: 'name',
  empresa: 'company',
  compañia: 'company',
  compania: 'company',
  company: 'company',
  correo: 'email',
  'correo electronico': 'email',
  'correo electrónico': 'email',
  email: 'email',
  telefono: 'phone',
  'teléfono': 'phone',
  phone: 'phone',
}

/**
 * Parses a CSV line honoring double quotes ("field, with comma").
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index++) {
    const char = line[index]

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"'
        index++
      } else {
        inQuotes = !inQuotes
      }
    } else if ((char === ',' || char === ';') && !inQuotes) {
      fields.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  fields.push(current.trim())
  return fields
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function normalizeCell(cell: SpreadsheetCell): string {
  if (cell === null || cell === undefined) return ''
  if (cell instanceof Date) return cell.toISOString().slice(0, 10)
  if (typeof cell === 'number') return String(cell)
  return String(cell).trim()
}

/**
 * Shared mapping for CSV and Excel uploads.
 * Header row is optional; when present, aliases in Spanish/English are accepted.
 * Column order fallback: CI, Nombre, Empresa, Correo, Teléfono.
 */
export function mapEmployeeRows(
  rawRows: string[][],
  forcedCompany?: string
): CsvParseResult {
  const nonEmptyRows = rawRows.filter((row) =>
    row.some((cell) => cell.trim().length > 0)
  )

  if (nonEmptyRows.length === 0) {
    return { rows: [], errors: [{ line: 0, reason: 'El contenido está vacío.' }] }
  }

  const firstFields = nonEmptyRows[0]
  const normalizedHeaders = firstFields.map(normalizeHeader)
  const hasHeader = normalizedHeaders.some((header) =>
    [
      'ci',
      'carnet',
      'nombre',
      'nombre y apellidos',
      'nombre completo',
      'name',
      'empresa',
      'company',
      'correo',
      'email',
      'telefono',
      'teléfono',
      'phone',
    ].includes(header)
  )

  const columnIndex: Record<string, number> = {}
  if (hasHeader) {
    normalizedHeaders.forEach((header, index) => {
      const mapped = HEADER_ALIASES[header]
      if (mapped && columnIndex[mapped] === undefined) {
        columnIndex[mapped] = index
      }
    })
  } else {
    EXPECTED_HEADERS.forEach((header, index) => {
      columnIndex[header] = index
    })
  }

  const dataRows = hasHeader ? nonEmptyRows.slice(1) : nonEmptyRows
  const rows: EmployeeUploadRow[] = []
  const errors: CsvParseResult['errors'] = []
  const headerOffset = hasHeader ? 2 : 1

  dataRows.forEach((fields, index) => {
    const lineNumber = index + headerOffset

    const ci = (columnIndex.ci !== undefined ? fields[columnIndex.ci] : '') ?? ''
    const name = (columnIndex.name !== undefined ? fields[columnIndex.name] : '') ?? ''
    const company = (columnIndex.company !== undefined ? fields[columnIndex.company] : '') ?? ''
    const email = (columnIndex.email !== undefined ? fields[columnIndex.email] : '') ?? ''
    const phone = (columnIndex.phone !== undefined ? fields[columnIndex.phone] : '') ?? ''

    if (!ci) {
      errors.push({ line: lineNumber, reason: 'Falta el CI.' })
      return
    }
    if (!/^\d{11}$/.test(ci)) {
      errors.push({
        line: lineNumber,
        reason: `CI inválido: "${ci}" (deben ser 11 dígitos). Si tiene ceros iniciales, formatea la columna como texto.`,
      })
      return
    }
    if (!name) {
      errors.push({ line: lineNumber, reason: 'Falta el nombre.' })
      return
    }
    if (!company && !forcedCompany) {
      errors.push({ line: lineNumber, reason: 'Falta la empresa.' })
      return
    }

    rows.push({
      ci,
      name,
      company: forcedCompany ?? company,
      email: email || undefined,
      phone: phone || undefined,
    })
  })

  return { rows, errors }
}

export function parseEmployeeCsv(input: string, forcedCompany?: string): CsvParseResult {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  return mapEmployeeRows(lines.map(parseCsvLine), forcedCompany)
}

export function parseEmployeeExcelRows(
  rawRows: SpreadsheetCell[][],
  forcedCompany?: string
): CsvParseResult {
  const rows = rawRows.map((row) => row.map(normalizeCell))
  return mapEmployeeRows(rows, forcedCompany)
}

export const EMPLOYEE_CSV_TEMPLATE = `ci,nombre,empresa,correo,telefono
85010112345,Juan Pérez García,Ministerio de la Industria Alimentaria,juan.perez@mia.gob.cu,+53 5555 1234
90020223456,María López Fernández,Ministerio de la Industria Alimentaria,maria.lopez@mia.gob.cu,
78030334567,Carlos Rodríguez Díaz,Ministerio de la Industria Alimentaria,,+53 5555 9876`
