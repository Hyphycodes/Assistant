"use client";

import Link from "next/link";
import { ArrowRight, BookOpenText, Boxes, ContactRound, Inbox, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useApp } from "@/components/app-provider";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";

export default function SearchPage() {
  const app = useApp();
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const result = useMemo(() => {
    if (!needle) return { things: [], contacts: [], inbox: [], templates: [] };
    const includes = (...values: unknown[]) => values.flat(Infinity).filter(Boolean).join(" ").toLowerCase().includes(needle);
    return {
      things: app.things.filter((thing) => includes(thing.title, thing.subtitle, thing.description, thing.summary, thing.tags, thing.sections.map((section) => [section.title, section.body]), thing.items.map((item) => [item.title, item.body]), thing.notes.map((note) => note.body), thing.options.map((option) => [option.name, option.description, option.recommendation]), app.activities.filter((activity) => activity.thingId === thing.id).map((activity) => activity.text))),
      contacts: app.contacts.filter((contact) => includes(contact.name, contact.context, contact.organization, contact.location, contact.note, contact.email, contact.phone, contact.tags)),
      inbox: app.inbox.filter((item) => includes(item.raw, item.fileName, item.proposal?.title, item.proposal?.summary)),
      templates: app.templates.filter((template) => includes(template.name, template.description, template.sections.map((section) => section.title), template.fields.map((field) => field.label))),
    };
  }, [app.things, app.contacts, app.inbox, app.templates, app.activities, needle]);
  const total = Object.values(result).reduce((sum, rows) => sum + rows.length, 0);
  return <div className="page search-page"><PageHeader eyebrow="Across the whole workspace" title="Search" intro="Find a Thing, person, original capture, product, decision, note, or template without remembering where it lives." />
    <label className="archive-search"><Search size={20} /><span className="sr-only">Search workspace</span><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search everything…" /></label>
    {!needle && <EmptyState title="Your whole workspace is one search away." body="Try a person, product, place, phrase, original capture, or Thing title." />}
    {needle && !total && <EmptyState title="No exact trail yet." body="Try fewer words or a broader phrase." />}
    {result.things.length > 0 && <SearchGroup icon={<Boxes size={16} />} title="Things" count={result.things.length}>{result.things.map((thing) => <Link className="search-result" href={`/things/${thing.id}`} key={thing.id}><div><div className="result-heading"><strong>{thing.title}</strong><StatusBadge status={thing.status} /></div><p>{thing.summary}</p><small>{thing.archived ? "Archived" : thing.category}</small></div><ArrowRight size={16} /></Link>)}</SearchGroup>}
    {result.contacts.length > 0 && <SearchGroup icon={<ContactRound size={16} />} title="Contacts" count={result.contacts.length}>{result.contacts.map((contact) => <Link className="search-result" href={`/contacts#${contact.id}`} key={contact.id}><div><strong>{contact.name}</strong><p>{contact.context}</p><small>{contact.organization ?? contact.email ?? "Contact"}</small></div><ArrowRight size={16} /></Link>)}</SearchGroup>}
    {result.inbox.length > 0 && <SearchGroup icon={<Inbox size={16} />} title="Original captures" count={result.inbox.length}>{result.inbox.map((item) => <Link className="search-result" href="/inbox" key={item.id}><div><strong>{item.proposal?.title ?? "Inbox capture"}</strong><p>{item.raw}</p><small>{item.type} · {item.status}</small></div><ArrowRight size={16} /></Link>)}</SearchGroup>}
    {result.templates.length > 0 && <SearchGroup icon={<BookOpenText size={16} />} title="Templates" count={result.templates.length}>{result.templates.map((template) => <Link className="search-result" href="/templates" key={template.id}><div><strong>{template.name}</strong><p>{template.description}</p></div><ArrowRight size={16} /></Link>)}</SearchGroup>}
  </div>;
}

function SearchGroup({ icon, title, count, children }: { icon: React.ReactNode; title: string; count: number; children: React.ReactNode }) { return <section className="search-group"><div className="search-group-title">{icon}<h2>{title}</h2><span>{count}</span></div>{children}</section>; }
