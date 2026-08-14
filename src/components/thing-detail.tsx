"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowUpRight, Check, Copy, Link2, MapPin, MoreHorizontal, Pencil, Plus, Send, Trash2, X } from "lucide-react";
import { useApp, type MutationResult } from "./app-provider";
import { ThingEditor } from "./thing-editor";
import { ThingWorkspace } from "./thing-workspace";
import { EmptyState } from "./ui";
import { formatDate, formatDateRange } from "@/lib/format";
import type { Approval, Option, Thing, ThingItem } from "@/lib/domain";

type OptionEntry = {
  key: string;
  title: string;
  take?: string;
  detail?: string;
  whyNow?: string;
  price?: string;
  url?: string;
  state: "open" | "approved" | "passed" | "later";
  stateLabel?: string;
  approval?: Approval;
  option?: Option;
};

const settled: Option["status"][] = ["approved", "ordered", "delivered", "keeping", "returning", "returned"];

function optionState(option: Option): { state: OptionEntry["state"]; label?: string } {
  if (option.status === "rejected") return { state: "passed", label: "Passed" };
  if (option.status === "saved") return { state: "later", label: "Saved for later" };
  if (option.status === "ordered") return { state: "approved", label: "Ordered" };
  if (option.status === "delivered") return { state: "approved", label: "Delivered" };
  if (settled.includes(option.status)) return { state: "approved", label: "Approved" };
  return { state: "open" };
}

export function ThingDetail({ id, returnTo = "/things" }: { id: string; returnTo?: string }) {
  const app = useApp(); const { things, approvals, activities, role } = app;
  const thing = things.find((item) => item.id === id);
  const [message, setMessage] = useState(""); const [editingThing, setEditingThing] = useState(false); const [manageOpen, setManageOpen] = useState(false); const [activityOpen, setActivityOpen] = useState(false);
  const [adding, setAdding] = useState(false); const [note, setNote] = useState("");
  const pending = approvals.filter((approval) => approval.thingId === id && approval.status === "pending");
  const activity = useMemo(() => activities.filter((entry) => entry.thingId === id), [activities, id]);

  if (!thing) return <div className="page"><EmptyState title="This Thing isn’t here." body="It may have moved into the archive." action={<Link href="/things" className="button quiet">Back to Things</Link>} /></div>;
  const exceptional = thing.status === "Needs You" ? "Needs you" : null;
  const tasks = thing.items.filter((item) => !item.archived).sort((a, b) => a.position - b.position);

  const entries: OptionEntry[] = [
    ...pending.map((approval) => ({
      key: `approval-${approval.id}`, title: approval.title, take: approval.recommendation, detail: approval.context, whyNow: approval.whyNow,
      price: approval.amount !== undefined ? `$${approval.amount.toLocaleString()} ${approval.currency ?? "USD"}` : undefined,
      state: "open" as const, approval,
    })),
    ...thing.options.map((option) => {
      const { state, label } = optionState(option);
      return { key: `option-${option.id}`, title: option.name, take: option.recommendation, detail: option.description, price: option.price, url: option.source || undefined, state, stateLabel: label, option };
    }),
  ].sort((a, b) => Number(a.state !== "open") - Number(b.state !== "open"));

  async function submitNote(event: React.FormEvent) { event.preventDefault(); if (!note.trim()) return; const result = await app.addNote(id, note.trim()); setMessage(result.message); if (result.ok) setNote(""); }

  return <div className="page calm-thing-detail">
    <Link href={returnTo} className="back-link"><ArrowLeft size={14} />Things</Link>
    <header className="calm-thing-header"><div>{exceptional ? <em>{exceptional}</em> : null}<h1>{thing.title}</h1>{thing.subtitle ? <p>{thing.subtitle}</p> : null}<small>{thing.dates[0] ? formatDateRange(thing.dates[0].start, thing.dates[0].end, thing.dates[0].precision) : null}{thing.dates[0] && thing.location ? " · " : null}{thing.location ? <><MapPin size={12} />{thing.location}</> : null}</small></div><div><button className="button quiet" onClick={() => setEditingThing(true)}><Pencil size={14} />Edit</button><details className="calm-more-menu"><summary className="icon-button" aria-label="More Thing actions"><MoreHorizontal /></summary><div><button onClick={() => setManageOpen(true)}>Manage</button><button onClick={() => setActivityOpen(true)}>Activity</button><button onClick={async () => setMessage((await app.duplicateThing(id)).message)}><Copy size={14} />Duplicate</button><button disabled={role !== "owner"} onClick={async () => { if (window.confirm("Archive this Thing?")) setMessage((await app.archiveThing(id)).message); }}><Trash2 size={14} />Archive</button></div></details></div></header>
    {message ? <div className="inline-notice" role="status"><Check size={14} />{message}<button onClick={() => setMessage("")} aria-label="Dismiss">×</button></div> : null}

    <p className="thing-summary">{thing.description || thing.summary}</p>

    <section className="thing-options">
      <div className="thing-section-title"><h2>Options</h2><button className="button quiet" onClick={() => setAdding((value) => !value)}><Plus size={14} />Add option</button></div>
      {role !== "owner" ? <p className="prepared-note">Prepared for Jerry.</p> : null}
      {adding ? <AddOptionForm thingId={id} onMessage={setMessage} onClose={() => setAdding(false)} /> : null}
      {entries.length ? <div className="option-list">{entries.map((entry) => <OptionEntryRow key={entry.key} thing={thing} entry={entry} onMessage={setMessage} />)}</div> : <p className="quiet-line">Nothing to decide yet. Maria will add options here.</p>}
    </section>

    <section className="calm-notes"><h2>Notes</h2>{thing.notes.length ? <div>{thing.notes.slice(0, 4).map((entry) => <CalmNote key={entry.id} thing={thing} note={entry} onMessage={setMessage} />)}</div> : null}<form onSubmit={submitNote}><textarea value={note} onChange={(event) => setNote(event.target.value)} aria-label="Add a note" placeholder="Add context or a note…" /><button className="button primary"><Send size={14} />Add note</button></form></section>

    {thing.sections.some((section) => !section.archived) || tasks.length ? <details className="thing-organize">
      <summary>Sections &amp; tasks</summary>
      <div>
        {thing.sections.filter((section) => !section.archived).sort((a, b) => a.position - b.position).map((section) => {
          const items = tasks.filter((item) => item.sectionId === section.id);
          return <section key={section.id}><h3>{section.title}</h3>{section.body ? <p>{section.body}</p> : null}{items.length ? <div className="calm-item-list">{items.map((item) => <CalmItem key={item.id} thing={thing} item={item} onMessage={setMessage} />)}</div> : null}</section>;
        })}
        {tasks.some((item) => !item.sectionId) ? <div className="calm-item-list">{tasks.filter((item) => !item.sectionId).map((item) => <CalmItem key={item.id} thing={thing} item={item} onMessage={setMessage} />)}</div> : null}
        <button className="button quiet" onClick={() => setManageOpen(true)}>Manage sections &amp; items</button>
      </div>
    </details> : null}

    {editingThing ? <ThingEditor thing={thing} onClose={() => setEditingThing(false)} onSaved={() => setMessage("Thing saved.")} /> : null}
    {manageOpen ? <ManageDrawer title="Manage Thing" onClose={() => setManageOpen(false)}><ThingWorkspace thing={thing} onMessage={setMessage} /><ManageLinks thing={thing} onMessage={setMessage} /></ManageDrawer> : null}
    {activityOpen ? <ManageDrawer title="Activity" onClose={() => setActivityOpen(false)}><div className="manage-activity">{activity.map((entry) => <article key={entry.id}><span>{entry.actor}</span><p>{entry.text}</p><small>{formatDate(entry.at, { month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })}</small></article>)}</div></ManageDrawer> : null}
  </div>;
}

function OptionEntryRow({ thing, entry, onMessage }: { thing: Thing; entry: OptionEntry; onMessage: (message: string) => void }) {
  const app = useApp(); const { role } = app; const option = entry.option; const approval = entry.approval;
  const order = option ? app.orders.find((record) => record.optionId === option.id) : undefined;
  const ordered = option?.status === "ordered" || option?.status === "delivered" || order?.status === "ordered" || order?.status === "delivered";
  const [busy, setBusy] = useState(false); const [editing, setEditing] = useState(false);
  const [name, setName] = useState(option?.name ?? ""); const [description, setDescription] = useState(option?.description ?? "");

  async function run(work: Promise<MutationResult>) { setBusy(true); const result = await work; setBusy(false); onMessage(result.message); return result; }
  async function decide(approved: boolean) {
    if (approval) return void run(app.resolveApproval(approval.id, approved ? "approved" : "rejected"));
    if (option) return void run(app.updateProductStatus(thing.id, option.id, approved ? "approved" : "rejected"));
  }
  async function toggleOrdered() {
    if (!option) return;
    await run(app.updateProductStatus(thing.id, option.id, ordered ? "approved" : "ordered"));
    if (order) await app.updateOrder({ ...order, status: ordered ? "planned" : "ordered" });
    else if (!ordered) await app.createOrder({ thingId: thing.id, optionId: option.id, retailer: option.retailer, status: "ordered" });
  }

  const stateLabel = entry.stateLabel && ordered && order?.expectedAt ? `${entry.stateLabel} · arriving ${formatDate(order.expectedAt)}` : entry.stateLabel;

  return <article className={`option-entry is-${entry.state}`}>
    <div className="option-entry-main">
      <h3>{entry.url ? <a href={entry.url} target="_blank" rel="noreferrer">{entry.title}<ArrowUpRight size={13} /></a> : entry.title}</h3>
      {entry.price ? <span className="option-entry-price">{entry.price}</span> : null}
      {entry.take ? <p className="option-entry-take">Maria: “{entry.take}”</p> : entry.detail ? <p className="option-entry-take">{entry.detail}</p> : null}
      {stateLabel ? <p className="option-entry-state">{entry.state === "approved" ? <Check size={12} /> : null}{stateLabel}</p> : null}
      {approval && (entry.detail || entry.whyNow) ? <details className="option-entry-why"><summary>Why?</summary><div>{entry.detail ? <p>{entry.detail}</p> : null}{entry.whyNow ? <p><strong>Why now:</strong> {entry.whyNow}</p> : null}</div></details> : null}
      {editing && option ? <form className="option-edit-form" onSubmit={async (event) => { event.preventDefault(); const result = await run(app.updateOption(thing.id, option.id, { ...option, name: name.trim(), description: description.trim() })); if (result.ok) setEditing(false); }}><input value={name} onChange={(event) => setName(event.target.value)} aria-label="Option name" required /><textarea value={description} onChange={(event) => setDescription(event.target.value)} aria-label="Option detail" /><div><button type="button" onClick={() => setEditing(false)}>Cancel</button><button>Save</button></div></form> : null}
    </div>
    <div className="option-entry-actions">
      {entry.state === "open" ? <>
        <button className="button primary" disabled={role !== "owner" || busy} onClick={() => void decide(true)}><Check size={15} />Approve</button>
        <button className="button quiet" disabled={role !== "owner" || busy} onClick={() => void decide(false)}>Pass</button>
      </> : option ? <button className="button quiet" disabled={busy} onClick={() => void run(app.updateProductStatus(thing.id, option.id, "considering"))}>Reopen</button> : null}
      {option ? <details className="option-entry-more"><summary aria-label={`More about ${option.name}`}><MoreHorizontal size={16} /></summary><div>
        <button onClick={() => setEditing((value) => !value)}>Edit</button>
        <button onClick={() => void run(app.updateProductStatus(thing.id, option.id, "saved"))}>Save for later</button>
        <button onClick={() => void toggleOrdered()}>{ordered ? "Not ordered yet" : "Mark as ordered"}</button>
        <button onClick={() => void run(app.removeOption(thing.id, option.id))}>Remove</button>
      </div></details> : null}
    </div>
  </article>;
}

function AddOptionForm({ thingId, onMessage, onClose }: { thingId: string; onMessage: (message: string) => void; onClose: () => void }) {
  const app = useApp();
  const [name, setName] = useState(""); const [source, setSource] = useState(""); const [price, setPrice] = useState(""); const [recommendation, setRecommendation] = useState("");
  return <form className="option-add-form" onSubmit={async (event) => {
    event.preventDefault(); if (!name.trim()) return;
    const result = await app.addOption(thingId, { name: name.trim(), description: recommendation.trim(), price: price.trim() || undefined, source: source.trim() || undefined, recommendation: recommendation.trim() || undefined });
    onMessage(result.message); if (result.ok) onClose();
  }}>
    <label>Option<input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="What did you find?" required /></label>
    <label>Link<input type="url" value={source} onChange={(event) => setSource(event.target.value)} placeholder="https://" /></label>
    <label>Price<input value={price} onChange={(event) => setPrice(event.target.value)} placeholder="$0" /></label>
    <label className="wide">Your take<textarea value={recommendation} onChange={(event) => setRecommendation(event.target.value)} placeholder="One line on why this one" /></label>
    <div><button type="button" className="button quiet" onClick={onClose}>Cancel</button><button className="button primary">Add</button></div>
  </form>;
}

function CalmItem({ thing, item, onMessage }: { thing: Thing; item: ThingItem; onMessage: (message: string) => void }) {
  const app = useApp(); const complete = item.status === "complete" || item.status === "done";
  if (item.type === "action" || item.type === "checklist") return <label className={`calm-task ${complete ? "complete" : ""}`}><input type="checkbox" checked={complete} onChange={async (event) => onMessage((await app.updateItem(thing.id, item.id, { status: event.target.checked ? "complete" : "open" })).message)} /><span><strong>{item.title}</strong>{item.body ? <small>{item.body}</small> : null}</span></label>;
  if (item.type === "link" && item.url) return <a className="calm-linked-item" href={item.url} target="_blank" rel="noreferrer"><Link2 size={14} />{item.title}<ArrowUpRight size={13} /></a>;
  return <div className={`calm-content-item item-${item.type}`}><strong>{item.title}</strong>{item.body ? <p>{item.body}</p> : null}</div>;
}

function CalmNote({ thing, note, onMessage }: { thing: Thing; note: Thing["notes"][number]; onMessage: (message: string) => void }) {
  const app = useApp(); const [editing, setEditing] = useState(false); const [body, setBody] = useState(note.body);
  return <article><span className={`avatar ${note.author === "Jerry" ? "avatar-owner" : "avatar-assistant"}`}>{note.author[0]}</span><div><strong>{note.author}</strong>{editing ? <form className="note-edit-form" onSubmit={async (event) => { event.preventDefault(); const result = await app.updateNote(thing.id, note.id, body.trim()); onMessage(result.message); if (result.ok) setEditing(false); }}><textarea value={body} onChange={(event) => setBody(event.target.value)} aria-label="Edit note" required /><div><button type="button" onClick={() => setEditing(false)}>Cancel</button><button>Save</button></div></form> : <p>{note.body}</p>}<small>{formatDate(note.at)}</small><details className="note-more"><summary aria-label={`More actions for ${note.author} note`}><MoreHorizontal size={14} /></summary><div><button onClick={() => setEditing(true)}>Edit</button><button onClick={async () => onMessage((await app.deleteNote(thing.id, note.id)).message)}>Delete</button></div></details></div></article>;
}

function ManageLinks({ thing, onMessage }: { thing: Thing; onMessage: (message: string) => void }) {
  const app = useApp(); const [title, setTitle] = useState(""); const [url, setUrl] = useState("");
  return <section className="manage-links"><h2>Links</h2>{thing.links.map((link) => <article key={link.id}><a href={link.url} target="_blank" rel="noreferrer">{link.title}</a><button onClick={async () => onMessage((await app.removeLink(thing.id, link.id)).message)}>Remove</button></article>)}<form onSubmit={async (event) => { event.preventDefault(); const result = await app.addLink(thing.id, title, url); onMessage(result.message); if (result.ok) { setTitle(""); setUrl(""); } }}><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Link title" required /><input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://" required /><button className="button quiet">Add link</button></form></section>;
}

function ManageDrawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="manage-backdrop" role="presentation" onClick={onClose}><aside className="manage-drawer" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}><header><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label={`Close ${title}`}><X /></button></header><div>{children}</div></aside></div>;
}
