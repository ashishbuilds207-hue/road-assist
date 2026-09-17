import path from 'path'
import os from 'os'

/**
 * Writable data directory.
 * Vercel/serverless: only /tmp is writable.
 * Local/dev: project `.data` folder.
 */
export function getDataDir() {
  if (process.env.RSA_DATA_DIR) {
    return process.env.RSA_DATA_DIR
  }

  const isServerless =
    process.env.VERCEL === '1' ||
    Boolean(process.env.VERCEL_ENV) ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME)

  if (isServerless) {
    return path.join(os.tmpdir(), 'rsa-data')
  }

  return path.join(process.cwd(), '.data')
}
