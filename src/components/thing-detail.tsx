"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowUpRight, Check, Copy, Link2, MapPin, MoreHorizontal, Pencil, Plus, Send, Trash2, X } from "lucide-react";
import { useApp } from "./app-provider";
import { ThingEditor } from "./thing-editor";
import { ThingWorkspace } from "./thing-workspace";
import { ApprovalCard, EmptyState } from "./ui";
import { formatDate, formatDateRange } from "@/lib/format";
import type { Option, Thing, ThingItem } from "@/lib/domain";

type AddKind = "note" | "action" | "product" | "person" | "link";

export function ThingDetail({ id, returnTo = "/things" }: { id: string; returnTo?: string }) {
  const app = useApp(); const { things, approvals, activities, role } = app;
  const thing = things.find((item) => item.id === id);
  const [message, setMessage] = useState(""); const [editingThing, setEditingThing] = useState(false); const [manageOpen, setManageOpen] = useState(false); const [activityOpen, setActivityOpen] = useState(false);
  const [addSectionId, setAddSectionId] = useState<string | null | undefined>(undefined); const [addKind, setAddKind] = useState<AddKind>("note"); const [addTitle, setAddTitle] = useState(""); const [addBody, setAddBody] = useState("");
  const [note, setNote] = useState("");
  const pending = approvals.filter((approval) => approval.thingId === id && approval.status === "pending");
  const activity = useMemo(() => activities.filter((entry) => entry.thingId === id), [activities, id]);

  if (!thing) return <div className="page"><EmptyState title="This Thing isn’t here." body="It may have moved into the archive." action={<Link href="/things" className="button quiet">Back to Things</Link>} /></div>;
  const exceptional = thing.status === "Needs You" ? "Needs you" : thing.status === "Waiting" ? `Waiting${thing.waitingOn ? ` on ${thing.waitingOn}` : ""}` : thing.status === "Ready" ? "Ready" : null;

  async function addContent(event: React.FormEvent) { event.preventDefault(); if (!addTitle.trim()) return; const result = addKind === "product" ? await app.addOption(id, { name: addTitle.trim(), description: addBody.trim() }) : await app.addItem(id, { sectionId: addSectionId ?? undefined, type: addKind, title: addTitle.trim(), body: addBody.trim() }); setMessage(result.message); if (result.ok) { setAddTitle(""); setAddBody(""); setAddSectionId(undefined); } }
  async function submitNote(event: React.FormEvent) { event.preventDefault(); if (!note.trim()) return; const result = await app.addNote(id, note.trim()); setMessage(result.message); if (result.ok) setNote(""); }

  return <div className="page calm-thing-detail">
    <Link href={returnTo} className="back-link"><ArrowLeft size={14} />Things</Link>
    <header className="calm-thing-header"><div>{exceptional ? <em>{exceptional}</em> : null}<h1>{thing.title}</h1>{thing.subtitle ? <p>{thing.subtitle}</p> : null}<small>{thing.dates[0] ? formatDateRange(thing.dates[0].start, thing.dates[0].end, thing.dates[0].precision) : null}{thing.dates[0] && thing.location ? " · " : null}{thing.location ? <><MapPin size={12} />{thing.location}</> : null}</small></div><div><button className="button quiet" onClick={() => setEditingThing(true)}><Pencil size={14} />Edit</button><details className="calm-more-menu"><summary className="icon-button" aria-label="More Thing actions"><MoreHorizontal /></summary><div><button onClick={() => setManageOpen(true)}>Manage</button><button onClick={() => setActivityOpen(true)}>Activity</button><button onClick={async () => setMessage((await app.duplicateThing(id)).message)}><Copy size={14} />Duplicate</button><button disabled={role !== "owner"} onClick={async () => { if (window.confirm("Archive this Thing?")) setMessage((await app.archiveThing(id)).message); }}><Trash2 size={14} />Archive</button></div></details></div></header>
    {message ? <div className="inline-notice" role="status"><Check size={14} />{message}<button onClick={() => setMessage("")} aria-label="Dismiss">×</button></div> : null}

    <section className="thing-brief"><span className="avatar avatar-assistant">M</span><div><strong>Maria</strong><p>“{thing.summary}”</p></div></section>
    {pending.length ? <section className="calm-thing-decisions"><h2>{pending.length === 1 ? "Decision" : "Decisions"}</h2>{pending.map((approval) => <ApprovalCard approval={approval} compact key={approval.id} onResolved={setMessage} />)}</section> : null}

    <div className="calm-content-sections">{thing.sections.filter((section) => !section.archived).sort((a, b) => a.position - b.position).map((section) => { const items = thing.items.filter((item) => !item.archived && item.sectionId === section.id).sort((a, b) => a.position - b.position); return <section key={section.id}><div className="content-section-title"><h2>{section.title}</h2><button onClick={() => { setAddSectionId(section.id); setAddKind("note"); }}><Plus size={13} />Add</button></div>{section.body ? <p className="section-intro">{section.body}</p> : null}{items.length ? <div className="calm-item-list">{items.map((item) => <CalmItem key={item.id} thing={thing} item={item} onMessage={setMessage} />)}</div> : null}{addSectionId === section.id ? <AddComposer kind={addKind} title={addTitle} body={addBody} onKind={setAddKind} onTitle={setAddTitle} onBody={setAddBody} onSubmit={addContent} onClose={() => setAddSectionId(undefined)} /> : null}</section>; })}</div>

    {thing.options.length ? <section className="calm-products"><h2>Products</h2><div>{thing.options.map((option, index) => <ProductCard key={option.id} thing={thing} option={option} index={index} onMessage={setMessage} />)}</div></section> : null}

    <section className="calm-notes"><h2>Conversation</h2>{thing.notes.length ? <div>{thing.notes.slice(0, 4).map((entry) => <CalmNote key={entry.id} thing={thing} note={entry} onMessage={setMessage} />)}</div> : null}<form onSubmit={submitNote}><textarea value={note} onChange={(event) => setNote(event.target.value)} aria-label="Add a note" placeholder="Add context or a note…" /><button className="button primary"><Send size={14} />Add note</button></form></section>
    <button className="add-something" onClick={() => { setAddSectionId(null); setAddKind("note"); }}><Plus size={15} />Add something</button>
    {addSectionId === null ? <AddComposer kind={addKind} title={addTitle} body={addBody} onKind={setAddKind} onTitle={setAddTitle} onBody={setAddBody} onSubmit={addContent} onClose={() => setAddSectionId(undefined)} /> : null}

    {editingThing ? <ThingEditor thing={thing} onClose={() => setEditingThing(false)} onSaved={() => setMessage("Thing saved.")} /> : null}
    {manageOpen ? <ManageDrawer title="Manage Thing" onClose={() => setManageOpen(false)}><ThingWorkspace thing={thing} onMessage={setMessage} /><ManageLinks thing={thing} onMessage={setMessage} /></ManageDrawer> : null}
    {activityOpen ? <ManageDrawer title="Activity" onClose={() => setActivityOpen(false)}><div className="manage-activity">{activity.map((entry) => <article key={entry.id}><span>{entry.actor}</span><p>{entry.text}</p><small>{formatDate(entry.at, { month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })}</small>{entry.before !== undefined || entry.after !== undefined ? <details><summary>Exact change</summary><pre>{JSON.stringify({ before: entry.before, after: entry.after }, null, 2)}</pre></details> : null}</article>)}</div></ManageDrawer> : null}
  </div>;
}

function CalmItem({ thing, item, onMessage }: { thing: Thing; item: ThingItem; onMessage: (message: string) => void }) {
  const app = useApp(); const complete = item.status === "complete" || item.status === "done";
  if (item.type === "action" || item.type === "checklist") return <label className={`calm-task ${complete ? "complete" : ""}`}><input type="checkbox" checked={complete} onChange={async (event) => onMessage((await app.updateItem(thing.id, item.id, { status: event.target.checked ? "complete" : "open" })).message)} /><span><strong>{item.title}</strong>{item.body ? <small>{item.body}</small> : null}</span></label>;
  if (item.type === "link" && item.url) return <a className="calm-linked-item" href={item.url} target="_blank" rel="noreferrer"><Link2 size={14} />{item.title}<ArrowUpRight size={13} /></a>;
  return <div className={`calm-content-item item-${item.type}`}><strong>{item.title}</strong>{item.body ? <p>{item.body}</p> : null}</div>;
}

function AddComposer({ kind, title, body, onKind, onTitle, onBody, onSubmit, onClose }: { kind: AddKind; title: string; body: string; onKind: (kind: AddKind) => void; onTitle: (value: string) => void; onBody: (value: string) => void; onSubmit: (event: React.FormEvent) => void; onClose: () => void }) {
  return <form className="calm-add-composer" onSubmit={onSubmit}><div className="add-kind-row">{(["note", "action", "product", "person", "link"] as AddKind[]).map((value) => <button type="button" key={value} className={kind === value ? "active" : ""} onClick={() => onKind(value)}>{value === "action" ? "Task" : value[0].toUpperCase() + value.slice(1)}</button>)}</div><input autoFocus value={title} onChange={(event) => onTitle(event.target.value)} placeholder={kind === "product" ? "Product name" : kind === "action" ? "What needs doing?" : "Add a title"} required /><textarea value={body} onChange={(event) => onBody(event.target.value)} placeholder="Optional detail" /><div><button type="button" className="button quiet" onClick={onClose}>Cancel</button><button className="button primary">Add</button></div></form>;
}

function ProductCard({ thing, option, index, onMessage }: { thing: Thing; option: Option; index: number; onMessage: (message: string) => void }) {
  const app = useApp(); const order = app.orders.find((entry) => entry.optionId === option.id); const [editing, setEditing] = useState(false); const [name, setName] = useState(option.name); const [description, setDescription] = useState(option.description);
  async function status(value: Option["status"]) { onMessage((await app.updateProductStatus(thing.id, option.id, value)).message); }
  return <article className="calm-product-card"><div className={`option-art option-art-${index % 3}`}>{option.image ? null : <span>{option.name.split(" ").slice(0, 2).map((word) => word[0]).join("")}</span>}</div><div><h3>{option.name}</h3>{option.price ? <strong className="product-price">{option.price}</strong> : null}{option.status === "recommended" ? <small>Maria’s pick</small> : null}<p>{option.recommendation ?? option.description}</p><div className="product-actions"><button className="button primary" onClick={() => void status("approved")}>Approve</button><button className="button quiet" onClick={() => void status("rejected")}>Pass</button><details><summary aria-label={`More about ${option.name}`}><MoreHorizontal size={16} /></summary><div>{editing ? <form className="product-edit-form" onSubmit={async (event) => { event.preventDefault(); const result = await app.updateOption(thing.id, option.id, { ...option, name: name.trim(), description: description.trim() }); onMessage(result.message); if (result.ok) setEditing(false); }}><input value={name} onChange={(event) => setName(event.target.value)} aria-label="Product name" required /><textarea value={description} onChange={(event) => setDescription(event.target.value)} aria-label="Product description" /><div><button type="button" onClick={() => setEditing(false)}>Cancel</button><button>Save</button></div></form> : <><p>{option.description}</p>{option.tradeoff ? <p><strong>Tradeoff:</strong> {option.tradeoff}</p> : null}{option.source ? <a href={option.source} target="_blank" rel="noreferrer">Source <ArrowUpRight size={12} /></a> : null}</>}<div className="product-natural-actions"><button onClick={() => setEditing(true)}>Edit</button><button onClick={() => void status("saved")}>Save for later</button><button onClick={() => void status("ordered")}>Ordered</button><button onClick={() => void status("delivered")}>Delivered</button><button onClick={() => void status("returning")}>Return</button>{!order ? <button onClick={async () => onMessage((await app.createOrder({ thingId: thing.id, optionId: option.id, retailer: option.retailer, status: "planned" })).message)}>Track order</button> : null}<button onClick={async () => onMessage((await app.removeOption(thing.id, option.id)).message)}>Remove</button></div>{order ? <label>Order<select value={order.status} onChange={async (event) => onMessage((await app.updateOrder({ ...order, status: event.target.value as typeof order.status })).message)}>{["planned", "approved", "ordered", "shipped", "delivered", "returning", "returned", "cancelled"].map((value) => <option key={value}>{value}</option>)}</select></label> : null}</div></details></div></div></article>;
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
