"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowUpRight, CalendarDays, Check, ChevronDown, CircleAlert, Clock3, Link2, MapPin, MessageCircle, MoreHorizontal, Plus, Send, ShoppingBag, Trash2, UserRound } from "lucide-react";
import { useApp } from "./app-provider";
import { ApprovalCard, EmptyState, PermissionBadge, StatusBadge, Toggle } from "./ui";
import { statusValues, type ThingStatus } from "@/lib/domain";
import { formatDate, formatDateRange } from "@/lib/format";

export function ThingDetail({ id }: { id: string }) {
  const { things, approvals, activities, toggleThing, setThingStatus, archiveThing, addNote, role } = useApp();
  const thing = things.find((item) => item.id === id);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [showStatus, setShowStatus] = useState(false);
  const thingApprovals = approvals.filter((approval) => approval.thingId === id && approval.status === "pending");
  const thingActivity = useMemo(() => activities.filter((activity) => activity.thingId === id), [activities, id]);

  if (!thing) return <div className="page"><EmptyState title="This Thing isn’t here." body="It may have been removed from this local demo." action={<Link href="/things" className="button quiet">Back to Things</Link>} /></div>;
  const currentStatus = thing.status;

  function submitNote(event: React.FormEvent) {
    event.preventDefault();
    if (!note.trim()) return;
    addNote(id, note.trim()); setNote(""); setMessage("Note added. It now appears in the activity trail.");
  }

  function changeStatus(status: ThingStatus) {
    const ok = setThingStatus(id, status);
    setMessage(ok ? `Moved to ${status}.` : `${currentStatus} can’t move directly to ${status}.`);
    setShowStatus(false);
  }

  return (
    <div className="page thing-detail-page">
      <Link href="/things" className="back-link"><ArrowLeft size={15} />All Things</Link>
      <header className="thing-header">
        <div className="thing-title-block"><div className="thing-kicker"><span>{thing.category}</span><StatusBadge status={thing.status} /><PermissionBadge permission={thing.permission} /></div><h1>{thing.title}</h1>{thing.location && <p><MapPin size={14} />{thing.location}</p>}</div>
        <div className="thing-header-actions">
          <div className="status-menu"><button className="button quiet" onClick={() => setShowStatus(!showStatus)}>Change status <ChevronDown size={15} /></button>{showStatus && <div className="status-popover">{statusValues.map((status) => <button key={status} disabled={status === thing.status} onClick={() => changeStatus(status)}>{status}</button>)}</div>}</div>
          <details className="more-menu"><summary className="icon-button" aria-label="More Thing actions"><MoreHorizontal /></summary><div><button onClick={() => { if (window.confirm("Move this Thing to Archive? Its history will remain searchable.")) archiveThing(id); }}><Trash2 size={15} />Archive Thing</button></div></details>
        </div>
      </header>
      {message && <div className="inline-notice" role="status"><Check size={15} />{message}<button onClick={() => setMessage("")} aria-label="Dismiss">×</button></div>}

      <div className="thing-layout">
        <div className="thing-primary">
          <section className="snapshot-card"><p className="eyebrow">The snapshot</p><p className="snapshot-copy">{thing.summary}</p><small>Maintained from the latest meaningful movement · {formatDate(thing.lastMoved)}</small></section>
          {thingApprovals.length > 0 && <section className="detail-section"><div className="detail-section-heading"><div><p className="eyebrow">The smallest decision</p><h2>Needs you</h2></div><CircleAlert size={18} /></div><div className="detail-approvals">{thingApprovals.map((approval) => <ApprovalCard approval={approval} key={approval.id} compact onResolved={setMessage} />)}</div></section>}
          {thing.sections.map((section) => <section className="detail-section prose-section" key={section.id}><p className="eyebrow">Context</p><h2>{section.title}</h2><p>{section.body}</p></section>)}
          {thing.options.length > 0 && <section className="detail-section"><div className="detail-section-heading"><div><p className="eyebrow">Compared, not dumped</p><h2>{thing.category === "Shopping" ? "The shortlist" : "Options worth considering"}</h2></div><ShoppingBag size={18} /></div><div className="option-grid">{thing.options.map((option, index) => <article className={`option-card ${option.status === "recommended" ? "recommended" : ""}`} key={option.id}>
            <div className={`option-art option-art-${index % 3}`} role="img" aria-label={`Editorial placeholder for ${option.name}`}><span>{option.name.split(" ").slice(0, 2).map((word) => word[0]).join("")}</span></div>
            <div className="option-body"><div className="option-top">{option.status === "recommended" && <span className="recommended-label">Maria’s pick</span>}<span>{option.status}</span></div><h3>{option.name}</h3><p>{option.description}</p>{option.price && <strong className="option-price">{option.price}</strong>}{option.recommendation && <div className="option-take"><span>Why it fits</span><p>{option.recommendation}</p></div>}{option.tradeoff && <p className="tradeoff"><strong>Tradeoff:</strong> {option.tradeoff}</p>}<div className="option-actions"><button className="button quiet">Save</button>{option.source && <a href={option.source} target="_blank" rel="noreferrer" className="text-link">Open source <ArrowUpRight size={13} /></a>}</div></div>
          </article>)}</div></section>}
          <section className="detail-section"><div className="detail-section-heading"><div><p className="eyebrow">The thread</p><h2>Notes & conversation</h2></div><MessageCircle size={18} /></div><form className="note-composer" onSubmit={submitNote}><label htmlFor="thing-note" className="sr-only">Add a note</label><textarea id="thing-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder={role === "assistant" ? "Add evidence, a follow-up, or what changed…" : "Add context without organizing it…"} /><button className="button primary" type="submit"><Send size={14} />Add note</button></form><div className="note-list">{thing.notes.map((item) => <article key={item.id}><span className={`avatar ${item.author === "Jerry" ? "avatar-owner" : "avatar-assistant"}`}>{item.author[0]}</span><div><div><strong>{item.author}</strong><small>{formatDate(item.at, { hour: "numeric", minute: "2-digit" })}</small></div><p>{item.body}</p></div></article>)}{!thing.notes.length && <p className="subtle-empty">No notes yet. The snapshot still holds the useful context.</p>}</div></section>
          <section className="detail-section"><div className="detail-section-heading"><div><p className="eyebrow">Meaningful movement</p><h2>Activity</h2></div><Clock3 size={18} /></div><div className="detail-activity">{thingActivity.map((item) => <article key={item.id}><span /><div><p>{item.text}</p><small>{formatDate(item.at, { month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })}</small></div></article>)}{!thingActivity.length && <p className="subtle-empty">Movement will show up here in plain language.</p>}</div></section>
        </div>
        <aside className="thing-sidebar">
          <section className="control-card"><p className="eyebrow">Operating permission</p><PermissionBadge permission={thing.permission} /><p>{thing.permission === "GO" ? "Maria can research, organize, draft, and follow up without interrupting you." : thing.permission === "APPROVE" ? "Maria prepares the action; Jerry resolves any money or commitment." : "Maria can prepare context, but Jerry personally handles the action."}</p></section>
          <Toggle checked={thing.keepMoving} onChange={() => toggleThing(id, "keepMoving")} label="Keep this moving" description="Surface a useful next step if this goes quiet." icon="flame" />
          <Toggle checked={thing.surpriseMe} onChange={() => toggleThing(id, "surpriseMe")} label="Surprise me" description="Occasional low-risk ideas that fit the brief." icon="sparkles" />
          {thing.dates.length > 0 && <section className="side-card"><p className="eyebrow">Dates</p>{thing.dates.map((date) => <div className="side-date" key={date.label}><CalendarDays size={16} /><div><strong>{date.label}</strong><p>{formatDateRange(date.start, date.end, date.precision)}</p><small>{date.readiness}</small></div></div>)}</section>}
          {thing.contacts.length > 0 && <section className="side-card"><p className="eyebrow">People</p>{thing.contacts.map((contact) => <div className="side-contact" key={contact.id}><span className="contact-avatar"><UserRound size={15} /></span><div><strong>{contact.name}</strong><p>{contact.context}</p>{contact.note && <small>{contact.note}</small>}</div></div>)}</section>}
          {thing.links.length > 0 && <section className="side-card"><p className="eyebrow">Links</p>{thing.links.map((link) => <a href={link.url} key={link.id}><Link2 size={14} />{link.title}</a>)}</section>}
          <button className="add-section"><Plus size={15} />Add a useful section</button>
        </aside>
      </div>
    </div>
  );
}
