"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Archive, CalendarDays, ChevronDown, CircleUserRound, ContactRound, Home, Inbox, ListTodo, Menu, MoreHorizontal, Plus, Search, Settings, Sparkles, X } from "lucide-react";
import type { Role } from "@/lib/domain";
import { AppProvider, useApp } from "./app-provider";

const ownerPrimary = [
  { href: "/", label: "Home", icon: Home },
  { href: "/things", label: "Things", icon: ListTodo },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
];

const assistantPrimary = [
  { href: "/assistant", label: "Today", icon: Sparkles },
  { href: "/things", label: "Things", icon: ListTodo },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
];

// Templates and tracked Preferences still exist as routes, but neither is
// something Jerry or Maria would open in a normal week, so neither is linked.
const secondary = [
  { href: "/search", label: "Search", icon: Search },
  { href: "/contacts", label: "Contacts", icon: ContactRound },
  { href: "/archive", label: "Archive", icon: Archive },
  { href: "/settings", label: "Settings", icon: Settings },
];

function ShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { role, inbox, activities } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const reviewCount = inbox.filter((item) => item.status === "needs_review").length;
  const primary = role === "owner" ? ownerPrimary : assistantPrimary;
  const moved = new Set(activities.slice(0, 8).map((item) => item.thingId)).size;
  const active = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  return <div className="app-frame calm-shell">
    <aside className="sidebar">
      <Link href={role === "owner" ? "/" : "/assistant"} className="brand-lockup sidebar-brand"><span className="brand-glyph">H</span><span>Hyphy HQ</span></Link>
      <Link href="/search" className="sidebar-search"><Search size={15} /><span>Search</span><kbd>⌘K</kbd></Link>
      <nav aria-label="Primary navigation" className="desktop-nav">
        {primary.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`nav-link ${active(href) ? "active" : ""}`} aria-current={active(href) ? "page" : undefined}><Icon size={17} strokeWidth={1.7} /><span>{label}</span>{label === "Inbox" && reviewCount > 0 ? <span className="nav-count">{reviewCount}</span> : null}</Link>)}
      </nav>
      {role === "owner" ? <Link href="/assistant" className="maria-summary"><span className="avatar avatar-assistant">M</span><span><strong>Maria</strong><small>{moved} moved today</small></span></Link> : null}
      <div className="sidebar-bottom">
        <details className="more-navigation"><summary className="nav-link"><MoreHorizontal size={18} /><span>More</span><ChevronDown size={14} /></summary><div className="more-popover">{secondary.map(({ href, label, icon: Icon }) => <Link href={href} key={href}><Icon size={16} />{label}</Link>)}</div></details>
        <details className="profile-menu"><summary><span className={`avatar ${role === "owner" ? "avatar-owner" : "avatar-assistant"}`}>{role === "owner" ? "J" : "M"}</span><span><strong>{role === "owner" ? "Jerry" : "Maria"}</strong><small>{role === "owner" ? "Owner" : "Assistant"}</small></span><ChevronDown size={15} /></summary><div className="profile-popover"><p>Hyphy HQ</p><form action="/api/auth/sign-out" method="post"><button type="submit">Sign out</button></form></div></details>
      </div>
    </aside>
    <header className="mobile-header"><Link href={role === "owner" ? "/" : "/assistant"} className="brand-lockup"><span className="brand-glyph">H</span><span>Hyphy HQ</span></Link><button className="icon-button" onClick={() => setMenuOpen(true)} aria-label="Open workspace menu"><Menu size={20} /></button></header>
    {menuOpen ? <div className="mobile-menu-backdrop" role="presentation" onClick={() => setMenuOpen(false)}><div className="mobile-menu" role="dialog" aria-modal="true" aria-label="Workspace menu" onClick={(event) => event.stopPropagation()}><button className="icon-button menu-close" onClick={() => setMenuOpen(false)} aria-label="Close workspace menu"><X /></button><div className="menu-person"><CircleUserRound /><span><strong>{role === "owner" ? "Jerry" : "Maria"}</strong><small>{role === "owner" ? "Owner view" : "Assistant view"}</small></span></div>{role === "owner" ? <Link href="/assistant" onClick={() => setMenuOpen(false)}><Sparkles size={18} />Maria · {moved} moved</Link> : null}{secondary.map(({ href, label, icon: Icon }) => <Link href={href} key={href} onClick={() => setMenuOpen(false)}><Icon size={18} />{label}</Link>)}<form action="/api/auth/sign-out" method="post"><button type="submit">Sign out</button></form></div></div> : null}
    <main className="main-content">{children}</main>
    <nav className="bottom-nav calm-bottom-nav" aria-label="Mobile navigation">
      <Link href={role === "owner" ? "/" : "/assistant"} className={active(role === "owner" ? "/" : "/assistant") ? "active" : ""}><Home size={20} /><small>{role === "owner" ? "Home" : "Today"}</small></Link>
      <Link href="/things" className={active("/things") ? "active" : ""}><ListTodo size={20} /><small>Things</small></Link>
      <Link href="/inbox" className="central-capture" aria-label="Capture"><span><Plus size={23} />{reviewCount > 0 ? <i>{reviewCount}</i> : null}</span><small>Capture</small></Link>
      <Link href="/calendar" className={active("/calendar") ? "active" : ""}><CalendarDays size={20} /><small>Calendar</small></Link>
      <Link href="/search" className={active("/search") ? "active" : ""}><Search size={20} /><small>Search</small></Link>
    </nav>
  </div>;
}

export function AppShell({ children, role, renderedAt }: { children: React.ReactNode; role: Role; renderedAt: string }) {
  return <AppProvider role={role} renderedAt={renderedAt}><ShellInner>{children}</ShellInner></AppProvider>;
}
