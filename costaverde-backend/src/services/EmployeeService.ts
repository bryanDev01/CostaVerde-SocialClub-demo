import { EmployeeQuery } from '../db/queries/employees.js'
import { isValidCI, isValidEmail, isValidPhone } from '../utils/validators.js'
import { ValidationError } from '../utils/errors.js'
import type {
  PreEmployee,
  PreEmployeeStatus,
  EmployeeUploadRow,
  EmployeeUploadResult,
} from '../types/employee.js'

// Upper bound per request to avoid payload-based DoS on the bulk endpoint.
const MAX_ROWS_PER_UPLOAD = 2000

export class EmployeeService {
  static validateRow(row: EmployeeUploadRow, index: number): string | null {
    if (!row.ci || !isValidCI(row.ci)) {
      return `Row ${index + 1}: invalid CI "${row.ci ?? ''}"`
    }
    if (!row.name || row.name.trim().length === 0) {
      return `Row ${index + 1}: name is required`
    }
    if (!row.company || row.company.trim().length === 0) {
      return `Row ${index + 1}: company is required`
    }
    if (row.email && !isValidEmail(row.email)) {
      return `Row ${index + 1}: invalid email "${row.email}"`
    }
    if (row.phone && !isValidPhone(row.phone)) {
      return `Row ${index + 1}: invalid phone "${row.phone}"`
    }
    return null
  }

  static async bulkUpload(
    rows: EmployeeUploadRow[],
    hrUserId: string,
    options?: { companyName?: string }
  ): Promise<EmployeeUploadResult> {
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new ValidationError('Upload file must contain at least one employee row')
    }
    if (rows.length > MAX_ROWS_PER_UPLOAD) {
      throw new ValidationError(
        `Upload is limited to ${MAX_ROWS_PER_UPLOAD} rows per request`
      )
    }

    // An HR account can only upload for its own company: the company is forced
    // server-side, ignoring whatever the file contains.
    const scopedRows = options?.companyName
      ? rows.map((row) => ({ ...row, company: options.companyName as string }))
      : rows

    const invalidRows: EmployeeUploadResult['errors'] = []
    const validRows: EmployeeUploadRow[] = []

    scopedRows.forEach((row, index) => {
      const error = EmployeeService.validateRow(row, index)
      if (error) {
        invalidRows.push({ row: index + 1, ci: row.ci ?? '', reason: error })
        return
      }
      validRows.push(row)
    })

    const result = await EmployeeQuery.bulkInsert(validRows, hrUserId)

    return {
      ...result,
      total: rows.length,
      errors: [...invalidRows, ...result.errors],
    }
  }

  static async getByCompany(company: string): Promise<PreEmployee[]> {
    return EmployeeQuery.getByCompany(company)
  }

  /**
  * Pending pre-employees. A company filter may be supplied by a caller, but
  * internal roles use the global list unless the request explicitly filters it.
   */
  static async getPending(company?: string): Promise<PreEmployee[]> {
    return EmployeeQuery.getByStatus('pending', company)
  }

  /**
   * Full pre-employee list with optional status filter (HR/Admin panels).
   */
  static async list(
    status: PreEmployeeStatus | undefined,
    company?: string
  ): Promise<PreEmployee[]> {
    return EmployeeQuery.listByStatus(status, company)
  }
}
