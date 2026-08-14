"use client";

import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useApp } from "@/components/app-provider";
import { EmptyState } from "@/components/ui";
import { formatDateRange } from "@/lib/format";

export default function SearchPage() {
  const app = useApp(); const [query, setQuery] = useState(""); const needle = query.trim().toLowerCase();
  const result = useMemo(() => {
    if (!needle) return { things: [], products: [], contacts: [], inbox: [] };
    const includes = (...values: unknown[]) => values.flat(Infinity).filter(Boolean).join(" ").toLowerCase().includes(needle);
    return {
      things: app.things.filter((thing) => includes(thing.title, thing.subtitle, thing.description, thing.summary, thing.tags, thing.sections.map((section) => [section.title, section.body]), thing.items.map((item) => [item.title, item.body]), thing.notes.map((note) => note.body))),
      products: app.things.flatMap((thing) => thing.options.filter((option) => includes(option.name, option.description, option.recommendation, option.retailer)).map((option) => ({ thing, option }))),
      contacts: app.contacts.filter((contact) => includes(contact.name, contact.context, contact.organization, contact.location, contact.note, contact.email, contact.phone, contact.tags)),
      inbox: app.inbox.filter((item) => includes(item.raw, item.fileName, item.proposal?.title, item.proposal?.summary)),
    };
  }, [app.things, app.contacts, app.inbox, needle]);
  const total = Object.values(result).reduce((sum, rows) => sum + rows.length, 0);
  return <div className="page calm-search-page"><header className="calm-page-header"><h1>Search</h1></header><label className="archive-search calm-search-input"><Search size={19} /><span className="sr-only">Search workspace</span><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search everything" /></label>
    {!needle ? <p className="search-hint">Try a Thing, product, person, place, or phrase.</p> : null}{needle && !total ? <EmptyState title="Nothing found." body="Try fewer words or a broader phrase." /> : null}
    {result.things.length ? <SearchGroup title="Things">{result.things.map((thing) => <Link className="search-result" href={`/things/${thing.id}`} key={thing.id}><div><strong>{thing.title}</strong><small>Thing{thing.dates[0] ? ` · ${formatDateRange(thing.dates[0].start, thing.dates[0].end, thing.dates[0].precision)}` : ""}</small></div><ArrowRight size={15} /></Link>)}</SearchGroup> : null}
    {result.products.length ? <SearchGroup title="Products">{result.products.map(({ thing, option }) => <Link className="search-result" href={`/things/${thing.id}`} key={`${thing.id}-${option.id}`}><div><strong>{option.name}</strong><small>Product · {thing.title}{option.price ? ` · ${option.price}` : ""}</small></div><ArrowRight size={15} /></Link>)}</SearchGroup> : null}
    {result.contacts.length ? <SearchGroup title="People">{result.contacts.map((contact) => <Link className="search-result" href={`/contacts#${contact.id}`} key={contact.id}><div><strong>{contact.name}</strong><small>{contact.context}{contact.organization ? ` · ${contact.organization}` : ""}</small></div><ArrowRight size={15} /></Link>)}</SearchGroup> : null}
    {result.inbox.length ? <SearchGroup title="Captures">{result.inbox.map((item) => <Link className="search-result" href="/inbox" key={item.id}><div><strong>{item.raw}</strong><small>{item.status === "needs_review" ? "Needs review" : item.proposal?.relatedThingId ? "Filed" : "Inbox"}</small></div><ArrowRight size={15} /></Link>)}</SearchGroup> : null}
  </div>;
}

function SearchGroup({ title, children }: { title: string; children: React.ReactNode }) { return <section className="search-group calm-search-group"><div className="search-group-title"><h2>{title}</h2></div>{children}</section>; }
