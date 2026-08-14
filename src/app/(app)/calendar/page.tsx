"use client";

import Link from "next/link";
import { PlugZap } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { formatDateRange } from "@/lib/format";

export default function CalendarPage() {
  const { things } = useApp();
  const events = things.flatMap((thing) => thing.archived ? [] : thing.dates.map((date) => ({ thing, date }))).sort((a, b) => a.date.start.localeCompare(b.date.start));
  return <div className="page calm-calendar-page">
    <header className="calm-page-header"><h1>Calendar</h1></header>
    <p className="calendar-sync-note"><PlugZap size={13} />Calendar sync is off. Thing dates still appear here.</p>
    <div className="calm-agenda">{events.map(({ thing, date }) => <Link href={`/things/${thing.id}`} key={`${thing.id}-${date.label}`}><time><span>{new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(date.start)).toUpperCase()}</span><strong>{date.precision === "month" ? "—" : new Intl.DateTimeFormat("en-US", { day: "numeric" }).format(new Date(date.start))}</strong>{date.precision === "range" && date.end ? <small>–{new Intl.DateTimeFormat("en-US", { day: "numeric" }).format(new Date(date.end))}</small> : null}</time><div><h2>{thing.title}</h2><p>{date.unresolved > 0 ? `${date.unresolved} ${date.unresolved === 1 ? "thing" : "things"} left` : date.readiness}</p><small>{formatDateRange(date.start, date.end, date.precision)}</small></div>{thing.status === "Needs You" ? <em>Needs you</em> : null}</Link>)}</div>
  </div>;
}
