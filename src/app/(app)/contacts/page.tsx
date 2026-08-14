"use client";

import { Check, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/app-provider";
import { EmptyState, PageHeader } from "@/components/ui";
import type { Contact } from "@/lib/domain";

const blank: Omit<Contact, "id"> = { name: "", context: "", organization: "", location: "", note: "", phone: "", email: "", socialHandle: "", tags: [] };

export default function ContactsPage() {
  const app = useApp(); const [creating, setCreating] = useState(false); const [notice, setNotice] = useState("");
  return <div className="page"><PageHeader eyebrow="People in context" title="Contacts" intro="The relationship, why they matter, and every Thing they are connected to." action={<button className="button primary" onClick={() => setCreating(true)}><Plus size={15} />New contact</button>} />
    {notice && <div className="inline-notice"><Check size={14} />{notice}</div>}
    {creating && <ContactForm contact={blank} onCancel={() => setCreating(false)} onSave={async (contact) => { const result = await app.createContact(contact); setNotice(result.message); if (result.ok) setCreating(false); }} />}
    <div className="contact-directory">{app.contacts.filter((contact) => !contact.archived).map((contact) => <ContactCard key={contact.id} contact={contact} onNotice={setNotice} />)}</div>
    {!app.contacts.some((contact) => !contact.archived) && <EmptyState title="No contacts yet." body="Add a person once, then connect them to Things and decisions." />}
  </div>;
}

function ContactCard({ contact, onNotice }: { contact: Contact; onNotice: (message: string) => void }) { const app = useApp(); const [editing, setEditing] = useState(false); const connected = app.things.filter((thing) => thing.contacts.some((item) => item.id === contact.id)); return <article id={contact.id} className="contact-card"><div><span className="contact-avatar">{contact.name.slice(0, 1)}</span><div><h2>{contact.name}</h2><p>{contact.context}</p><small>{[contact.organization, contact.location, contact.email, contact.phone].filter(Boolean).join(" · ")}</small></div></div><div className="contact-tags">{contact.tags?.map((tag) => <span key={tag}>{tag}</span>)}</div><p>{connected.length ? `Connected to ${connected.map((thing) => thing.title).join(", ")}` : "Not connected to a Thing yet."}</p><div className="compact-actions"><button onClick={() => setEditing(true)}>Edit</button><button onClick={async () => onNotice((await app.archiveContact(contact.id)).message)}><Trash2 size={13} />Archive</button></div>{editing && <ContactForm contact={contact} onCancel={() => setEditing(false)} onSave={async (next) => { const result = await app.updateContact({ ...next, id: contact.id }); onNotice(result.message); if (result.ok) setEditing(false); }} />}</article>; }

function ContactForm({ contact, onCancel, onSave }: { contact: Omit<Contact, "id">; onCancel: () => void; onSave: (contact: Omit<Contact, "id">) => Promise<void> }) { const [value, setValue] = useState(contact); const set = (key: keyof typeof value, next: string | string[]) => setValue((current) => ({ ...current, [key]: next })); return <form className="panel-form" onSubmit={(event) => { event.preventDefault(); void onSave(value); }}><label>Name<input autoFocus required value={value.name} onChange={(event) => set("name", event.target.value)} /></label><label>Context<input required value={value.context} onChange={(event) => set("context", event.target.value)} /></label><label>Organization<input value={value.organization ?? ""} onChange={(event) => set("organization", event.target.value)} /></label><label>Location<input value={value.location ?? ""} onChange={(event) => set("location", event.target.value)} /></label><label>Email<input type="email" value={value.email ?? ""} onChange={(event) => set("email", event.target.value)} /></label><label>Phone<input value={value.phone ?? ""} onChange={(event) => set("phone", event.target.value)} /></label><label className="wide">Notes<textarea value={value.note ?? ""} onChange={(event) => set("note", event.target.value)} /></label><label className="wide">Tags<input value={(value.tags ?? []).join(", ")} onChange={(event) => set("tags", event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean))} /></label><div className="wide compact-actions"><button type="button" className="button quiet" onClick={onCancel}>Cancel</button><button className="button primary">Save contact</button></div></form>; }
