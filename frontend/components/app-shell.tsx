'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Menu } from '@base-ui/react/menu'
import { ChevronsUpDown, LogOut, Menu as MenuIcon, Vault, X, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SESSIONS, initials, readTokenClaims, type Role } from '@/lib/session'

export type NavItem = { label: string; href: string; icon: LucideIcon }

function SidebarNav({ nav, pathname }: { nav: NavItem[]; pathname: string }) {
  return (
    <nav className="flex-1 space-y-1 px-3 py-2">
      {nav.map(({ label, href, icon: Icon }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
            )}
          >
            {active && (
              <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-r-full bg-indigo-600" />
            )}
            <Icon
              className={cn(
                'size-[18px]',
                active ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600',
              )}
            />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

function AccountMenu({
  name,
  email,
  portal,
  onSignOut,
}: {
  name: string
  email: string
  portal: string
  onSignOut: () => void
}) {
  return (
    <Menu.Root>
      <Menu.Trigger
        className="flex w-full cursor-pointer items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-slate-50 focus-visible:ring-3 focus-visible:ring-indigo-500/40 focus-visible:outline-none data-[popup-open]:bg-slate-50"
        aria-label="Account menu"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-xs font-semibold text-white">
          {initials(name || email)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-slate-900">{name}</span>
          <span className="block truncate text-xs text-slate-500">{portal}</span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-slate-400" />
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner side="top" align="start" sideOffset={8} className="z-50">
          <Menu.Popup className="w-[15rem] origin-[var(--transform-origin)] rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-900/10 outline-none">
            <div className="border-b border-slate-100 px-2.5 pt-1.5 pb-2.5">
              <p className="truncate text-sm font-medium text-slate-900">{name}</p>
              <p className="truncate text-xs text-slate-500">{email || portal}</p>
            </div>
            <Menu.Item
              onClick={onSignOut}
              className="mt-1.5 flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-slate-700 outline-none select-none data-highlighted:bg-slate-100 data-highlighted:text-slate-900"
            >
              <LogOut className="size-4 text-slate-400" />
              Sign out
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}

export function AppShell({
  role,
  portal,
  nav,
  title,
  description,
  actions,
  children,
}: {
  role: Role
  portal: string
  nav: NavItem[]
  title: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [account, setAccount] = useState({ name: portal, email: '' })

  const session = SESSIONS[role]

  useEffect(() => {
    const claims = readTokenClaims(localStorage.getItem(session.tokenKey))
    const stored = role === 'payer' ? localStorage.getItem('payerName') : null
    const email = claims.email ?? ''
    setAccount({ name: stored || email.split('@')[0] || portal, email })
  }, [role, portal, session.tokenKey])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  function signOut() {
    localStorage.removeItem(session.tokenKey)
    for (const key of session.clearKeys) localStorage.removeItem(key)
    router.replace(session.loginPath)
  }

  return (
    <div className="min-h-svh bg-slate-50">
      {mobileOpen && (
        <button
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <span className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-600">
              <Vault className="size-[18px] text-white" strokeWidth={2.4} />
            </span>
            <span className="text-[0.95rem] font-semibold tracking-tight text-slate-900">
              VaultPay
            </span>
          </span>
          <button
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
            className="cursor-pointer rounded-md p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600 lg:hidden"
          >
            <X className="size-5" />
          </button>
        </div>

        <SidebarNav nav={nav} pathname={pathname} />

        <div className="border-t border-slate-200 p-3">
          <AccountMenu
            name={account.name}
            email={account.email}
            portal={portal}
            onSignOut={signOut}
          />
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-4 sm:px-8">
            <button
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
              className="-ml-1 cursor-pointer rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
            >
              <MenuIcon className="size-5" />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-semibold tracking-tight text-slate-900">
                {title}
              </h1>
              {description && (
                <p className="truncate text-sm text-slate-500">{description}</p>
              )}
            </div>

            {actions}
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  )
}
