import { redirect } from 'next/navigation'

/** Password reset not used in DEMO OTP flow */
export default function ForgotPage() {
  redirect('/login')
}
