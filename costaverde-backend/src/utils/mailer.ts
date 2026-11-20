export interface PasswordResetEmail {
  to: string
  name: string
  resetUrl: string
}

/**
 * Placeholder transport for password reset emails.
 *
 * No SMTP/provider is configured yet, so the link is logged instead. When a
 * provider is added (nodemailer, Resend, etc.) wire it here and return true.
 * Returns whether the email was actually delivered.
 */
export async function sendPasswordResetEmail(
  _payload: PasswordResetEmail
): Promise<boolean> {
  // Never log the reset link: it contains a live token and logs are not a
  // secret store. Only record that a reset was requested.
  console.info('[password-reset] Solicitud registrada; proveedor de correo no configurado')
  return false
}
