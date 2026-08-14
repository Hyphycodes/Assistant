"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock, CheckCircle2, CircleAlert, PlugZap } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { PageHeader, StatusBadge } from "@/components/ui";
import { daysUntil, formatDateRange } from "@/lib/format";

export default function CalendarPage() {
  const { things, approvals } = useApp();
  const events = things.flatMap((thing) => thing.archived ? [] : thing.dates.map((date) => ({ thing, date, approvals: approvals.filter((approval) => approval.thingId === thing.id && approval.status === "pending").length }))).sort((a, b) => a.date.start.localeCompare(b.date.start));
  return (
    <div className="page calendar-page">
      <PageHeader eyebrow="Dates with context" title="Calendar" intro="A date is only useful when you can see whether you’re ready for it." action={<button className="button quiet"><PlugZap size={15} />Connect calendar</button>} />
      <div className="calendar-note"><CalendarClock size={18} /><div><strong>Workspace timeline</strong><p>Calendar sync is disconnected. These dates come from your Things and stay fully useful without it.</p></div></div>
      <div className="timeline">
        {events.map(({ thing, date, approvals: count }, index) => (
          <article className="timeline-row" key={`${thing.id}-${date.label}`}>
            <div className="timeline-date"><span>{date.precision === "month" ? "MONTH" : new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(date.start)).toUpperCase()}</span><strong>{date.precision === "month" ? "DEC" : new Intl.DateTimeFormat("en-US", { day: "numeric" }).format(new Date(date.start))}</strong><small>{date.precision === "range" && date.end ? `— ${new Intl.DateTimeFormat("en-US", { day: "numeric" }).format(new Date(date.end))}` : new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(new Date(date.start))}</small></div>
            <div className="timeline-spine"><i />{index < events.length - 1 && <span />}</div>
            <div className="timeline-card">
              <div className="timeline-card-top"><div><p className="eyebrow">{formatDateRange(date.start, date.end, date.precision)} · {daysUntil(date.start)}</p><h2>{thing.title}</h2></div><StatusBadge status={thing.status} /></div>
              <p>{thing.summary}</p>
              <div className={`readiness ${date.unresolved === 0 ? "ready" : "attention"}`}>{date.unresolved === 0 ? <CheckCircle2 size={17} /> : <CircleAlert size={17} />}<div><strong>{date.readiness}</strong><span>{date.unresolved} unresolved {date.unresolved === 1 ? "item" : "items"}{count ? ` · ${count} awaiting your decision` : ""}</span></div></div>
              <Link href={`/things/${thing.id}`} className="text-link">Open Thing <ArrowRight size={14} /></Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
