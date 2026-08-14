"use client";

import Link from "next/link";
import { ArrowRight, Check, Eye, MoreHorizontal, Send } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/app-provider";
import { AssistantActionDialog, type WorkbenchAction } from "@/components/assistant-action-dialog";
import type { Thing } from "@/lib/domain";
import { daysUntil } from "@/lib/format";

export default function AssistantPage() {
  const app = useApp(); const { role, things, approvals, renderedAt } = app;
  const [notice, setNotice] = useState(""); const [dialog, setDialog] = useState<{ thing: Thing; action: WorkbenchAction } | null>(null);
  const active = things.filter((thing) => !thing.archived && !["Done", "Someday", "Waiting"].includes(thing.status));
  const doNext = [...active].sort((a, b) => (a.dates[0]?.start ?? "9999").localeCompare(b.dates[0]?.start ?? "9999") || Number(b.priority === "high") - Number(a.priority === "high")).slice(0, 5);
  const waiting = things.filter((thing) => !thing.archived && (thing.status === "Waiting" || thing.waitingOn));
  const decisions = approvals.filter((approval) => approval.status === "pending");
  const more = things.filter((thing) => !thing.archived && (thing.status === "Someday" || (thing.keepMoving && !doNext.some((item) => item.id === thing.id))));
  const open = (thing: Thing, action: WorkbenchAction) => { if (role === "assistant") setDialog({ thing, action }); };

  return <div className="page calm-assistant-page">
    {role === "owner" ? <div className="preview-banner"><Eye size={15} /><span>Maria’s view · actions are read-only for Jerry.</span></div> : null}
    <header className="calm-page-header"><div><p className="home-date">{new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date(renderedAt))}</p><h1>Today</h1></div></header>
    {notice ? <div className="inline-notice" role="status"><Check size={15} />{notice}<button onClick={() => setNotice("")} aria-label="Dismiss">×</button></div> : null}

    <section className="assistant-today-section"><h2>Do next</h2><div className="do-next-list">{doNext.map((thing) => <article key={thing.id}><Link href={`/things/${thing.id}`}><strong>{thing.title}</strong><p>{thing.assistantNextAction}</p>{thing.dates[0] ? <small>{daysUntil(thing.dates[0].start, renderedAt)}</small> : null}</Link><div><button disabled={role !== "assistant"} onClick={() => open(thing, thing.permission === "APPROVE" || thing.permission === "YOU" ? "approval" : "movement")}>{thing.permission === "APPROVE" || thing.permission === "YOU" ? "Prepare decision" : "Add update"}</button><details><summary aria-label={`More actions for ${thing.title}`}><MoreHorizontal size={16} /></summary><div><button disabled={role !== "assistant"} onClick={() => open(thing, "follow-up")}>Follow up</button><button disabled={role !== "assistant"} onClick={() => open(thing, "link")}>Add link</button><button disabled={role !== "assistant"} onClick={() => open(thing, "option")}>Add option</button></div></details></div></article>)}</div></section>

    <section className="assistant-today-section"><h2>Waiting</h2>{waiting.length ? <div className="calm-waiting-list">{waiting.map((thing) => <article key={thing.id}><Link href={`/things/${thing.id}`}><strong>{thing.waitingOn ?? thing.waiting?.label ?? "Response"}</strong><p>{thing.title}{thing.waiting?.followUpAt ? ` · ${daysUntil(thing.waiting.followUpAt, renderedAt)}` : ""}</p></Link><button disabled={role !== "assistant"} onClick={() => open(thing, "follow-up")}><Send size={13} />Follow up</button></article>)}</div> : <p className="calm-empty-line">Nothing is waiting on a response.</p>}</section>

    <section className="assistant-today-section needs-jerry-summary"><details><summary><span><h2>Needs Jerry</h2><p>{decisions.length} {decisions.length === 1 ? "decision" : "decisions"} waiting</p></span><ArrowRight size={16} /></summary><div>{decisions.map((approval) => <Link href={`/things/${approval.thingId}`} key={approval.id}><strong>{approval.title}</strong><p>{approval.recommendation}</p></Link>)}</div></details></section>

    {more.length ? <details className="more-work"><summary>More to work on <ArrowRight size={15} /></summary><div>{more.map((thing) => <Link href={`/things/${thing.id}`} key={thing.id}><strong>{thing.title}</strong><p>{thing.assistantNextAction}</p></Link>)}</div></details> : null}
    <p className="honesty-line">Drafted work stays drafted. Nothing is sent, booked, or purchased without a connected provider and the right approval.</p>
    {dialog ? <AssistantActionDialog thing={dialog.thing} action={dialog.action} onClose={() => setDialog(null)} onDone={setNotice} /> : null}
  </div>;
}
