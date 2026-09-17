/**
 * Case number formatting helpers.
 * Format: RSA-YYYYMMDD-XXXX (sequence zero-padded)
 */

export function formatCaseNumber(
  date: Date | string,
  sequence: number
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const seq = String(Math.max(0, sequence)).padStart(4, '0')
  return `RSA-${yyyy}${mm}${dd}-${seq}`
}

export function parseCaseNumber(caseNumber: string): {
  datePart: string
  sequence: number
  valid: boolean
} | null {
  const match = /^RSA-(\d{8})-(\d{4,})$/i.exec(caseNumber.trim())
  if (!match) {
    return { datePart: '', sequence: 0, valid: false }
  }
  return {
    datePart: match[1],
    sequence: Number(match[2]),
    valid: true,
  }
}

export function generateTemporaryCaseNumber(): string {
  const now = new Date()
  const seq = Math.floor(Math.random() * 9000) + 1000
  return formatCaseNumber(now, seq)
}

export function formatInvoiceNumber(
  date: Date | string,
  sequence: number
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const seq = String(Math.max(0, sequence)).padStart(5, '0')
  return `INV-${yyyy}${mm}-${seq}`
}
