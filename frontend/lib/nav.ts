import { Home, Link2, Receipt, ShieldAlert, Store, Wallet } from 'lucide-react'
import type { NavItem } from '@/components/app-shell'

export const MERCHANT_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/merchant/dashboard', icon: Home },
  { label: 'Payment Links', href: '/merchant/payment-link', icon: Link2 },
  { label: 'Payments', href: '/merchant/payments', icon: Receipt },
]

export const SUPERADMIN_NAV: NavItem[] = [
  { label: 'Merchants', href: '/superadmin/dashboard', icon: Store },
  { label: 'Fraud alerts', href: '/superadmin/fraud', icon: ShieldAlert },
]

export const PAYER_NAV: NavItem[] = [
  { label: 'My payments', href: '/payer', icon: Wallet },
]
