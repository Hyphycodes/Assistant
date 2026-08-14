"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock, Check, CircleAlert, Clock3, Eye, FilePlus2, MessageSquareText, Sparkles, UsersRound } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/app-provider";
import { PageHeader, PermissionBadge, StatusBadge } from "@/components/ui";
import { daysUntil } from "@/lib/format";

export default function AssistantPage() {
  const { role, things, approvals, addNote } = useApp();
  const [notice, setNotice] = useState("");
  const active = things.filter((thing) => !thing.archived && !["Done", "Someday"].includes(thing.status));
  const timeSensitive = active.filter((thing) => thing.dates.length > 0).sort((a, b) => a.dates[0].start.localeCompare(b.dates[0].start));
  const waiting = active.filter((thing) => thing.status === "Waiting" || thing.waitingOn);
  const keepMoving = active.filter((thing) => thing.keepMoving).sort((a, b) => a.lastMoved.localeCompare(b.lastMoved));
  const decisions = approvals.filter((approval) => approval.status === "pending");

  function quickNote(thingId: string) {
    addNote(thingId, "Maria reviewed this Thing and prepared the next useful step.");
    setNotice("Movement recorded. Jerry will see it on Home.");
  }

  return (
    <div className="page assistant-page">
      {role === "owner" && <div className="preview-banner"><Eye size={16} /><span><strong>Owner preview</strong> — you can see Maria’s briefing, but assistant controls are intentionally disabled.</span></div>}
      <PageHeader eyebrow="Assistant briefing" title="Good evening, Maria." intro={`You have ${decisions.length} decisions to prepare and ${waiting.length || 2} follow-ups worth checking.`} action={<button className="button primary" disabled={role !== "assistant"}><Sparkles size={15} />Find useful work</button>} />
      {notice && <div className="inline-notice" role="status"><Check size={15} />{notice}<button onClick={() => setNotice("")}>×</button></div>}
      <div className="briefing-signal"><Sparkles size={18} /><div><p className="eyebrow">Best next move</p><strong>Christmas trip has been quiet for over a week.</strong><p>Holiday pricing may be worth checking. Compare flight windows for Italy and Costa Rica, then add one recommendation—not a link dump.</p></div><Link href="/things/christmas-trip" className="button quiet">Open Thing <ArrowRight size={14} /></Link></div>

      <div className="assistant-grid">
        <section className="assistant-section wide"><div className="section-heading compact"><div><p className="eyebrow">Dates set the order</p><h2>Time-sensitive</h2></div><CalendarClock size={18} /></div><div className="work-list">{timeSensitive.map((thing) => <article className="work-item" key={thing.id}><div className="work-index"><span>{new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(thing.dates[0].start))}</span><strong>{new Intl.DateTimeFormat("en-US", { day: "numeric" }).format(new Date(thing.dates[0].start))}</strong></div><div className="work-copy"><div><Link href={`/things/${thing.id}`}>{thing.title}</Link><StatusBadge status={thing.status} /></div><p>{thing.dates[0].readiness}</p><small><Clock3 size={12} />{daysUntil(thing.dates[0].start)} · {thing.dates[0].unresolved} unresolved</small></div><div className="work-actions"><button onClick={() => quickNote(thing.id)} disabled={role !== "assistant"} aria-label={`Record movement on ${thing.title}`}><FilePlus2 size={15} /></button><Link href={`/things/${thing.id}`} aria-label={`Open ${thing.title}`}><ArrowRight size={16} /></Link></div></article>)}</div></section>
        <section className="assistant-section"><div className="section-heading compact"><div><p className="eyebrow">Make the ask smaller</p><h2>Jerry decisions</h2></div><CircleAlert size={18} /></div><div className="decision-mini-list">{decisions.slice(0, 4).map((approval) => { const thing = things.find((item) => item.id === approval.thingId); return <Link href={`/things/${approval.thingId}`} key={approval.id}><div><strong>{approval.title}</strong><p>{approval.whyNow}</p></div>{thing && <PermissionBadge permission={thing.permission} />}</Link>; })}</div></section>
        <section className="assistant-section"><div className="section-heading compact"><div><p className="eyebrow">Don’t let it disappear</p><h2>Things worth pushing</h2></div><Sparkles size={18} /></div><div className="push-list">{keepMoving.slice(0, 4).map((thing) => <Link href={`/things/${thing.id}`} key={thing.id}><span><strong>{thing.title}</strong><p>{thing.status === "Needs You" ? "A prepared decision is the current bottleneck." : thing.dates[0] ? `${thing.dates[0].readiness}.` : "A small useful next step can keep this warm."}</p></span><ArrowRight size={15} /></Link>)}</div></section>
        <section className="assistant-section wide"><div className="section-heading compact"><div><p className="eyebrow">Follow-through</p><h2>Waiting on others</h2></div><UsersRound size={18} /></div>{waiting.length ? <div className="waiting-strip">{waiting.map((thing) => <Link href={`/things/${thing.id}`} key={thing.id}><MessageSquareText size={17} /><span><strong>{thing.title}</strong><p>Waiting on {thing.waitingOn}. Review the last touch before following up.</p></span><ArrowRight size={15} /></Link>)}</div> : <div className="calm-empty"><Check size={17} /><p>No follow-up is overdue. Use the room for research or a Keep This Moving item.</p></div>}</section>
      </div>
      <p className="honesty-line">No calls, messages, bookings, or purchases are executed in demo mode. Drafted work stays visibly drafted.</p>
    </div>
  );
}
