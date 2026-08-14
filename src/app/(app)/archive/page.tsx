"use client";

import Link from "next/link";
import { ArchiveRestore, ArrowRight, PackageCheck, Search, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { useApp } from "@/components/app-provider";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { formatDate } from "@/lib/format";

export default function ArchivePage() {
  const app = useApp();
  const { things, activities, inbox } = app;
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const results = useMemo(() => things.filter((thing) => {
    if (!needle) return thing.archived;
    return `${thing.title} ${thing.summary} ${thing.sections.map((section) => `${section.title} ${section.body}`).join(" ")} ${thing.notes.map((note) => note.body).join(" ")} ${thing.contacts.map((contact) => `${contact.name} ${contact.context} ${contact.organization ?? ""}`).join(" ")} ${thing.options.map((option) => `${option.name} ${option.description}`).join(" ")} ${activities.filter((activity) => activity.thingId === thing.id).map((activity) => activity.text).join(" ")}`.toLowerCase().includes(needle);
  }), [things, activities, needle]);
  const inboxMatches = needle ? inbox.filter((item) => item.raw.toLowerCase().includes(needle)) : [];
  const contactMatches = needle ? things.flatMap((thing) => thing.contacts.map((contact) => ({ contact, thing }))).filter(({ contact }) => `${contact.name} ${contact.context} ${contact.organization ?? ""}`.toLowerCase().includes(needle)) : [];

  return (
    <div className="page archive-page">
      <PageHeader eyebrow="Your external memory" title="Archive" intro="Past people, products, decisions, and ideas—still connected to the story they belonged to." />
      <label className="archive-search"><Search size={20} /><span className="sr-only">Search your memory</span><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try “Vanessa”, “tent”, or “what worked”…" /><kbd>⌘ K</kbd></label>
      {!needle && <div className="archive-prompt"><ArchiveRestore size={19} /><p><strong>Finished, not forgotten.</strong> Search everything or browse the Things you’ve wrapped up.</p></div>}
      {contactMatches.length > 0 && <section className="search-group"><div className="search-group-title"><UserRound size={16} /><h2>People</h2><span>{contactMatches.length}</span></div>{contactMatches.map(({ contact, thing }) => <Link href={`/things/${thing.id}`} className="search-result" key={`${thing.id}-${contact.id}`}><div><strong>{contact.name}</strong><p>{contact.context}{contact.organization ? ` · ${contact.organization}` : ""}</p><small>Connected to {thing.title}</small></div><ArrowRight size={16} /></Link>)}</section>}
      <section className="search-group"><div className="search-group-title"><PackageCheck size={16} /><h2>{needle ? "Things & context" : "Completed Things"}</h2><span>{results.length}</span></div>{results.map((thing) => <article className="search-result" key={thing.id}><Link href={`/things/${thing.id}`}><div><div className="result-heading"><strong>{thing.title}</strong><StatusBadge status={thing.status} /></div><p>{thing.summary}</p><small>Last moved {formatDate(thing.lastMoved)}</small></div><ArrowRight size={16} /></Link>{thing.archived && <button className="button quiet" onClick={() => void app.restoreThing(thing.id)}><ArchiveRestore size={14} />Restore</button>}</article>)}</section>
      {inboxMatches.length > 0 && <section className="search-group"><div className="search-group-title"><ArchiveRestore size={16} /><h2>Original captures</h2><span>{inboxMatches.length}</span></div>{inboxMatches.map((item) => <Link href="/inbox" className="search-result" key={item.id}><div><strong>{item.proposal?.title ?? "Inbox capture"}</strong><p>{item.raw}</p><small>Original {item.type} · preserved</small></div><ArrowRight size={16} /></Link>)}</section>}
      {needle && !results.length && !contactMatches.length && !inboxMatches.length && <EmptyState title="Nothing surfaced yet." body="Try a person, product, place, phrase, or Thing title." />}
    </div>
  );
}
