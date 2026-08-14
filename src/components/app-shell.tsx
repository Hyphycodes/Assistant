"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Archive, CalendarDays, ChevronDown, CircleUserRound, Home, Inbox, ListTodo, Menu, Settings, Sparkles, X } from "lucide-react";
import type { Role } from "@/lib/domain";
import { AppProvider, useApp } from "./app-provider";

const primary = [
  { href: "/", label: "Home", icon: Home },
  { href: "/things", label: "Things", icon: ListTodo },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/archive", label: "Archive", icon: Archive },
];

function ShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { role, inbox } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const reviewCount = inbox.filter((item) => item.status === "needs_review").length;
  const active = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Link href="/" className="brand-lockup sidebar-brand"><span className="brand-glyph">H</span><span>Hyphy HQ</span></Link>
        <nav aria-label="Primary navigation" className="desktop-nav">
          {primary.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={`nav-link ${active(href) ? "active" : ""}`} aria-current={active(href) ? "page" : undefined}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
              {label === "Inbox" && reviewCount > 0 && <span className="nav-count">{reviewCount}</span>}
            </Link>
          ))}
          <div className="nav-divider" />
          <Link href="/assistant" className={`nav-link assistant-link ${active("/assistant") ? "active" : ""}`} aria-current={active("/assistant") ? "page" : undefined}>
            <Sparkles size={18} strokeWidth={1.8} /><span>Assistant</span>
          </Link>
        </nav>
        <div className="sidebar-bottom">
          <Link href="/settings" className={`nav-link ${active("/settings") ? "active" : ""}`}><Settings size={18} /><span>Settings</span></Link>
          <details className="profile-menu">
            <summary>
              <span className={`avatar ${role === "owner" ? "avatar-owner" : "avatar-assistant"}`}>{role === "owner" ? "J" : "M"}</span>
              <span><strong>{role === "owner" ? "Jerry" : "Maria"}</strong><small>{role === "owner" ? "Owner" : "Assistant"}</small></span>
              <ChevronDown size={15} />
            </summary>
            <div className="profile-popover">
              <p>Hyphy HQ Demo</p>
              <form action="/api/auth/sign-out" method="post"><button type="submit">Sign out</button></form>
            </div>
          </details>
        </div>
      </aside>
      <header className="mobile-header">
        <Link href="/" className="brand-lockup"><span className="brand-glyph">H</span><span>Hyphy HQ</span></Link>
        <button className="icon-button" onClick={() => setMenuOpen(true)} aria-label="Open workspace menu"><Menu size={20} /></button>
      </header>
      {menuOpen && (
        <div className="mobile-menu-backdrop" role="presentation" onClick={() => setMenuOpen(false)}>
          <div className="mobile-menu" role="dialog" aria-modal="true" aria-label="Workspace menu" onClick={(event) => event.stopPropagation()}>
            <button className="icon-button menu-close" onClick={() => setMenuOpen(false)} aria-label="Close workspace menu"><X /></button>
            <div className="menu-person"><CircleUserRound /><span><strong>{role === "owner" ? "Jerry" : "Maria"}</strong><small>{role === "owner" ? "Owner view" : "Assistant view"}</small></span></div>
            <Link href="/assistant" onClick={() => setMenuOpen(false)}><Sparkles size={18} /> Assistant briefing</Link>
            <Link href="/settings" onClick={() => setMenuOpen(false)}><Settings size={18} /> Settings</Link>
            <form action="/api/auth/sign-out" method="post"><button type="submit">Sign out</button></form>
          </div>
        </div>
      )}
      <main className="main-content">{children}</main>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {primary.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={active(href) ? "active" : ""} aria-current={active(href) ? "page" : undefined}>
            <span className={label === "Inbox" ? "capture-icon" : ""}><Icon size={20} />{label === "Inbox" && reviewCount > 0 && <i>{reviewCount}</i>}</span>
            <small>{label}</small>
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function AppShell({ children, role, renderedAt }: { children: React.ReactNode; role: Role; renderedAt: string }) {
  return <AppProvider role={role} renderedAt={renderedAt}><ShellInner>{children}</ShellInner></AppProvider>;
}
