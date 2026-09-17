export type FormatValidationResult = {
  valid: boolean
  message: string
  /** Format-only label — never claim government verification */
  verificationLabel: 'Format Valid' | 'Invalid Format'
}

function result(
  valid: boolean,
  message: string
): FormatValidationResult {
  return {
    valid,
    message,
    verificationLabel: valid ? 'Format Valid' : 'Invalid Format',
  }
}

/** US phone: 10 digits, optional +1 / formatting */
export function validateUSPhone(input: string): FormatValidationResult {
  const digits = input.replace(/\D/g, '')
  const normalized =
    digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits

  if (normalized.length !== 10) {
    return result(false, 'Enter a valid 10-digit US phone number')
  }
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(normalized)) {
    return result(false, 'Enter a valid 10-digit US phone number')
  }
  return result(true, 'Phone format looks correct')
}

export function validateEmail(input: string): FormatValidationResult {
  const trimmed = input.trim()
  if (!trimmed) {
    return result(false, 'Email is required')
  }
  // Practical format check (not RFC-complete)
  const emailRe =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/
  if (!emailRe.test(trimmed)) {
    return result(false, 'Enter a valid email address')
  }
  return result(true, 'Email format looks correct')
}

export function validateZIP(input: string): FormatValidationResult {
  const trimmed = input.trim()
  if (!/^\d{5}(-\d{4})?$/.test(trimmed)) {
    return result(false, 'Enter a valid ZIP (12345 or 12345-6789)')
  }
  return result(true, 'ZIP format looks correct')
}

const US_STATES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC',
])

export function validateState(input: string): FormatValidationResult {
  const code = input.trim().toUpperCase()
  if (!US_STATES.has(code)) {
    return result(false, 'Enter a valid 2-letter US state code')
  }
  return result(true, 'State format looks correct')
}

/** VIN: 17 alphanumeric, no I/O/Q */
export function validateVIN(input: string): FormatValidationResult {
  const vin = input.trim().toUpperCase()
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
    return result(
      false,
      'VIN must be 17 characters (letters/numbers, no I, O, or Q)'
    )
  }
  return result(true, 'VIN format looks correct')
}

/** USDOT: typically 1–8 digits */
export function validateUSDOT(input: string): FormatValidationResult {
  const digits = input.replace(/\D/g, '')
  if (!/^\d{1,8}$/.test(digits)) {
    return result(false, 'USDOT should be 1–8 digits')
  }
  return result(true, 'USDOT format looks correct')
}

/** MC number: often MC followed by digits, or digits alone */
export function validateMC(input: string): FormatValidationResult {
  const trimmed = input.trim().toUpperCase()
  const digits = trimmed.replace(/^MC-?/i, '').replace(/\D/g, '')
  if (!/^\d{1,8}$/.test(digits)) {
    return result(false, 'MC number should be 1–8 digits (optional MC prefix)')
  }
  return result(true, 'MC number format looks correct')
}
