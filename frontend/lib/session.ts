export type Role = 'payer' | 'merchant' | 'superadmin'

export const SESSIONS = {
  payer: { tokenKey: 'payerToken', loginPath: '/', clearKeys: ['payerName', 'payerEmail'] },
  merchant: { tokenKey: 'merchant_token', loginPath: '/merchant/login', clearKeys: [] },
  superadmin: { tokenKey: 'superadmin_token', loginPath: '/superadmin/login', clearKeys: [] },
} as const satisfies Record<Role, { tokenKey: string; loginPath: string; clearKeys: readonly string[] }>

/** Display-only decode. The signature is never trusted here — the API re-verifies. */
export function readTokenClaims(token: string | null): { email?: string; role?: string } {
  if (!token) return {}
  try {
    const part = token.split('.')[1]
    if (!part) return {}
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json) as { email?: string; role?: string }
  } catch {
    return {}
  }
}

export function initials(value: string): string {
  const source = value.includes('@') ? value.split('@')[0].replace(/[._-]+/g, ' ') : value
  return (
    source
      .split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  )
}
