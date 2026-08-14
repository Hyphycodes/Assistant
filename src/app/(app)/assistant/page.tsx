"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock, Check, CircleAlert, Clock3, Eye, FilePlus2, Link2, ListPlus, MessageSquareText, Send, Sparkles, UsersRound } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/app-provider";
import { AssistantActionDialog, type WorkbenchAction } from "@/components/assistant-action-dialog";
import { PageHeader, PermissionBadge, StatusBadge } from "@/components/ui";
import { daysUntil } from "@/lib/format";
import type { Thing, ThingStatus } from "@/lib/domain";

export default function AssistantPage() {
  const app = useApp();
  const { role, things, approvals, renderedAt } = app;
  const [notice, setNotice] = useState("");
  const [dialog, setDialog] = useState<{ thing: Thing; action: WorkbenchAction } | null>(null);
  const active = things.filter((thing) => !thing.archived && !["Done", "Someday"].includes(thing.status));
  const timeSensitive = active.filter((thing) => thing.dates.length > 0).sort((a, b) => a.dates[0].start.localeCompare(b.dates[0].start));
  const waiting = active.filter((thing) => thing.status === "Waiting" || thing.waitingOn);
  const keepMoving = active.filter((thing) => thing.keepMoving).sort((a, b) => a.lastMoved.localeCompare(b.lastMoved));
  const someday = things.filter((thing) => !thing.archived && thing.status === "Someday");
  const decisions = approvals.filter((approval) => approval.status === "pending");
  const open = (thing: Thing, action: WorkbenchAction) => role === "assistant" && setDialog({ thing, action });

  async function setStatus(thing: Thing, status: ThingStatus) {
    setNotice((await app.setThingStatus(thing.id, status)).message);
  }

  return <div className="page assistant-page">
    {role === "owner" && <div className="preview-banner"><Eye size={16} /><span><strong>Owner preview</strong> — this shows Maria’s real workbench. Controls stay disabled because assistant actions must be attributed to Maria.</span></div>}
    <PageHeader eyebrow="Assistant workbench" title="Good evening, Maria." intro={`${decisions.length} decisions to prepare · ${waiting.length} follow-ups to manage · every action remains attributable.`} action={<button className="button primary" disabled={role !== "assistant"} onClick={() => keepMoving[0] && open(keepMoving[0], "movement")}><Sparkles size={15} />Find useful work</button>} />
    {notice && <div className="inline-notice" role="status"><Check size={15} />{notice}<button onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}
    <div className="briefing-signal"><Sparkles size={18} /><div><p className="eyebrow">Best next move</p><strong>{keepMoving[0]?.title ?? "The active queue is clear."}</strong><p>{keepMoving[0]?.assistantNextAction ?? "Use the room for research or a low-risk draft."}</p></div>{keepMoving[0] && <button className="button quiet" disabled={role !== "assistant"} onClick={() => open(keepMoving[0], "movement")}>Record movement</button>}</div>
    <div className="assistant-grid">
      <section className="assistant-section wide"><div className="section-heading compact"><div><p className="eyebrow">Dates set the order</p><h2>Time-sensitive</h2></div><CalendarClock size={18} /></div><div className="work-list">{timeSensitive.map((thing) => <WorkRow key={thing.id} thing={thing} renderedAt={renderedAt} disabled={role !== "assistant"} onAction={open} onStatus={setStatus} />)}</div></section>
      <section className="assistant-section wide"><div className="section-heading compact"><div><p className="eyebrow">Follow-through</p><h2>Waiting on others</h2></div><UsersRound size={18} /></div>{waiting.length ? <div className="waiting-strip">{waiting.map((thing) => <article key={thing.id}><MessageSquareText size={17} /><span><Link href={`/things/${thing.id}`}><strong>{thing.title}</strong></Link><p>Waiting on {thing.waitingOn ?? "a response"}. {thing.assistantNextAction}</p></span><div className="compact-actions"><button disabled={role !== "assistant"} onClick={() => open(thing, "follow-up")}><Send size={14} />Prepare follow-up</button><button disabled={role !== "assistant"} onClick={async () => setNotice((await app.markResponded(thing.id)).message)}><Check size={14} />Mark responded</button></div></article>)}</div> : <div className="calm-empty"><Check size={17} /><p>No follow-up is overdue.</p></div>}</section>
      <section className="assistant-section"><div className="section-heading compact"><div><p className="eyebrow">Make the ask smaller</p><h2>Jerry decisions</h2></div><CircleAlert size={18} /></div><div className="decision-mini-list">{decisions.slice(0, 4).map((approval) => { const thing = things.find((item) => item.id === approval.thingId); return <Link href={`/things/${approval.thingId}`} key={approval.id}><div><strong>{approval.title}</strong><p>{approval.whyNow}</p></div>{thing && <PermissionBadge permission={thing.permission} />}</Link>; })}</div>{active[0] && <button className="button quiet workbench-add" disabled={role !== "assistant"} onClick={() => open(active[0], "approval")}><CircleAlert size={14} />Prepare another decision</button>}</section>
      <section className="assistant-section"><div className="section-heading compact"><div><p className="eyebrow">Don’t let it disappear</p><h2>Things worth pushing</h2></div><Sparkles size={18} /></div><div className="push-list">{keepMoving.slice(0, 4).map((thing) => <article key={thing.id}><Link href={`/things/${thing.id}`}><span><strong>{thing.title}</strong><p>{thing.assistantNextAction}</p></span><ArrowRight size={15} /></Link><div className="inline-work-actions"><button disabled={role !== "assistant"} onClick={() => open(thing, "link")}><Link2 size={13} />Link</button><button disabled={role !== "assistant"} onClick={() => open(thing, "option")}><ListPlus size={13} />Option</button><button disabled={role !== "assistant"} onClick={() => open(thing, "approval")}><CircleAlert size={13} />Ask Jerry</button></div></article>)}</div></section>
      <section className="assistant-section wide"><div className="section-heading compact"><div><p className="eyebrow">Keep warm, no pressure</p><h2>Someday ideas</h2></div><Sparkles size={18} /></div><div className="waiting-strip">{someday.map((thing) => <article key={thing.id}><Sparkles size={17} /><span><Link href={`/things/${thing.id}`}><strong>{thing.title}</strong></Link><p>{thing.assistantNextAction}</p></span><button disabled={role !== "assistant"} onClick={() => open(thing, "movement")}><FilePlus2 size={14} />Add useful work</button></article>)}</div></section>
    </div>
    <p className="honesty-line">No calls, messages, bookings, or purchases are executed in demo mode. Drafted work stays visibly drafted.</p>
    {dialog && <AssistantActionDialog thing={dialog.thing} action={dialog.action} onClose={() => setDialog(null)} onDone={setNotice} />}
  </div>;
}

function WorkRow({ thing, renderedAt, disabled, onAction, onStatus }: { thing: Thing; renderedAt: string; disabled: boolean; onAction: (thing: Thing, action: WorkbenchAction) => void; onStatus: (thing: Thing, status: ThingStatus) => void }) {
  return <article className="work-item"><div className="work-index"><span>{new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(thing.dates[0].start))}</span><strong>{new Intl.DateTimeFormat("en-US", { day: "numeric" }).format(new Date(thing.dates[0].start))}</strong></div><div className="work-copy"><div><Link href={`/things/${thing.id}`}>{thing.title}</Link><StatusBadge status={thing.status} /></div><p>{thing.assistantNextAction}</p><small><Clock3 size={12} />{daysUntil(thing.dates[0].start, renderedAt)} · {thing.dates[0].unresolved} unresolved</small></div><div className="work-row-buttons"><button disabled={disabled} onClick={() => onAction(thing, "movement")}><FilePlus2 size={14} />Movement</button><button disabled={disabled} onClick={() => onAction(thing, "follow-up")}><Send size={14} />Follow-up</button><select disabled={disabled} value={thing.status} onChange={(event) => onStatus(thing, event.target.value as ThingStatus)} aria-label={`Change ${thing.title} status`}><option>{thing.status}</option><option>Moving</option><option>Waiting</option><option>Needs You</option><option>Ready</option><option>Done</option></select></div></article>;
}
