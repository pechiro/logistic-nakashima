"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType } from "react";
import {
  ArrowDownUp,
  FolderKanban,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Users,
  X,
} from "lucide-react";
import { logout } from "@/app/login/actions";
import { AutoRefresh } from "@/components/auto-refresh";

type IconType = ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

type NavItem = { label: string; href?: string; icon: IconType; soon?: boolean };

const PRIMARY_NAV: NavItem[] = [
  { label: "Panel de Control", href: "/", icon: LayoutDashboard },
  { label: "Productos", href: "/products", icon: Package },
  { label: "Inventario", href: "/stock", icon: ArrowDownUp },
  { label: "Movimientos", href: "/movements", icon: History },
  { label: "Proyectos", href: "/proyectos", icon: FolderKanban },
];

// Honest roadmap: the features we're building next, shown but not yet active.
const UPCOMING_NAV: NavItem[] = [
  { label: "Equipo", icon: Users, soon: true },
];

function Wordmark() {
  return (
    <div className="flex items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-nakashima.png"
        alt=""
        width={32}
        height={32}
        className="h-8 w-8 shrink-0 rounded-md object-contain"
      />
      <span className="font-display text-[15px] font-semibold leading-tight tracking-tight text-ink">
        Logística Grupo Nakashima
      </span>
    </div>
  );
}

function NavContent({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-5">
      <div>
        <p className="px-3 pb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
          Almacén
        </p>
        <ul className="space-y-0.5">
          {PRIMARY_NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.label}>
                <Link
                  href={item.href!}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`group flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-accent-weak text-accent"
                      : "text-ink-muted hover:bg-surface-2 hover:text-ink"
                  }`}
                >
                  <item.icon
                    size={17}
                    className={active ? "text-accent" : "text-ink-faint"}
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <p className="px-3 pb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
          Próximamente
        </p>
        <ul className="space-y-0.5">
          {UPCOMING_NAV.map((item) => (
            <li key={item.label}>
              <div
                aria-disabled="true"
                className="flex cursor-default select-none items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-ink-faint"
              >
                <item.icon size={17} className="opacity-60" />
                <span className="flex-1">{item.label}</span>
                <span className="rounded-full border border-line px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                  Pronto
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

function WorkspaceFooter() {
  return (
    <div className="border-t border-line px-3 py-3">
      <form action={logout}>
        <button
          type="submit"
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <LogOut size={17} className="text-ink-faint" />
          Cerrar Sesión
        </button>
      </form>
      <div className="mt-1 flex items-center gap-2 px-3 pt-2 text-xs text-ink-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-ok" aria-hidden />
        <span>Espacio en la nube</span>
        <span className="ml-auto font-mono text-ink-faint">Supabase</span>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // The login screen stands alone — no sidebar, no app chrome.
  const isAuthRoute = pathname === "/login";
  const navPanelRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Close the mobile menu on navigation. Comparing against the previously
  // rendered pathname (instead of a setState-in-effect) avoids a cascading
  // render while still collapsing the menu whenever the route changes.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMenuOpen(false);
  }

  // While the mobile menu is open: lock scroll, Escape to close, move focus in,
  // trap Tab within the panel, and restore focus to the trigger on close.
  useEffect(() => {
    if (!menuOpen) return;
    const panel = navPanelRef.current;
    // Capture the trigger now; the ref may point elsewhere by cleanup time.
    const menuButton = menuButtonRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const FOCUSABLE =
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusTimer = window.setTimeout(() => {
      panel?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    }, 30);

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      } else if (active && !panel.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey, true);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey, true);
      menuButton?.focus();
    };
  }, [menuOpen]);

  if (isAuthRoute) return <>{children}</>;

  return (
    <div className="flex min-h-screen">
      {/* Keep every authed page in sync with the shared cloud DB. */}
      <AutoRefresh />

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex h-16 items-center px-5">
          <Wordmark />
        </div>
        <NavContent pathname={pathname} />
        <WorkspaceFooter />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur-md lg:hidden">
          <button
            ref={menuButtonRef}
            type="button"
            className="icon-btn"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menú"
            aria-expanded={menuOpen}
            aria-haspopup="dialog"
          >
            <Menu size={20} />
          </button>
          <Wordmark />
        </div>

        {children}
      </div>

      {/* Mobile off-canvas nav */}
      <div
        className={`fixed inset-0 z-40 lg:hidden ${menuOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!menuOpen}
        inert={!menuOpen}
      >
        <div
          onClick={() => setMenuOpen(false)}
          className={`absolute inset-0 bg-ink/30 transition-opacity duration-200 motion-reduce:transition-none ${
            menuOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          ref={navPanelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Navegación principal"
          className={`absolute inset-y-0 left-0 flex w-72 max-w-[82%] flex-col border-r border-line bg-surface shadow-xl transition-transform duration-200 ease-out motion-reduce:transition-none ${
            menuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-16 items-center justify-between px-5">
            <Wordmark />
            <button
              type="button"
              className="icon-btn"
              onClick={() => setMenuOpen(false)}
              aria-label="Cerrar menú"
            >
              <X size={18} />
            </button>
          </div>
          <NavContent pathname={pathname} onNavigate={() => setMenuOpen(false)} />
          <WorkspaceFooter />
        </aside>
      </div>
    </div>
  );
}
