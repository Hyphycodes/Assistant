"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { ThingEditor } from "@/components/thing-editor";
import { EmptyState, ThingRow } from "@/components/ui";
import { displayStatus, type Thing, type ThingFilter } from "@/lib/domain";

const statusFilters = [
  { value: "active", label: "Open" },
  { value: "needs-you", label: "Needs You" },
  { value: "done", label: "Done" },
] as const;

export function ThingsIndex({ initialFilter, initialQuery, initialSort }: { initialFilter: ThingFilter; initialQuery: string; initialSort: string }) {
  const router = useRouter();
  const { things, approvals } = useApp();
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState(initialFilter);
  const [sort, setSort] = useState(["recent", "upcoming", "alpha", "blocked"].includes(initialSort) ? initialSort : "recent");
  const [editing, setEditing] = useState<Thing | "new" | null>(null);
  const later = filter === "someday";

  function updateUrl(next: { filter?: ThingFilter; query?: string; sort?: string }) {
    const values = { filter, query, sort, ...next }; const params = new URLSearchParams(); params.set("filter", values.filter); if (values.query) params.set("q", values.query); if (values.sort !== "recent") params.set("sort", values.sort); router.replace(`/things?${params.toString()}`, { scroll: false });
  }

  const filtered = useMemo(() => things.filter((thing) => {
    const pending = approvals.some((approval) => approval.thingId === thing.id && approval.status === "pending");
    const saved = thing.status === "Someday";
    const status = displayStatus(thing.status);
    const matchesFilter = filter === "needs-you" ? !thing.archived && (status === "Needs You" || pending) : filter === "done" ? thing.archived || status === "Done" : filter === "someday" ? !thing.archived && saved : !thing.archived && !saved && status !== "Done";
    if (!matchesFilter) return false; return !query || `${thing.title} ${thing.summary} ${thing.ownerNextAction} ${thing.assistantNextAction}`.toLowerCase().includes(query.toLowerCase());
  }).sort((a, b) => sort === "alpha" ? a.title.localeCompare(b.title) : sort === "upcoming" ? (a.dates[0]?.start ?? "9999").localeCompare(b.dates[0]?.start ?? "9999") : sort === "blocked" ? Number(Boolean(b.waitingOn)) - Number(Boolean(a.waitingOn)) : b.lastMoved.localeCompare(a.lastMoved)), [things, approvals, query, filter, sort]);

  function switchView(view: "active" | "later") { const next: ThingFilter = view === "active" ? "active" : "someday"; setFilter(next); updateUrl({ filter: next }); }
  const filterCount = filter === "active" || filter === "someday" ? 0 : 1;

  return <div className="page calm-things-page">
    <header className="calm-page-header"><h1>Things</h1><button className="button primary" onClick={() => setEditing("new")}><Plus size={16} />New</button></header>
    <div className="things-toolbar"><label className="search-field"><Search size={16} /><span className="sr-only">Search Things</span><input value={query} onChange={(event) => { setQuery(event.target.value); updateUrl({ query: event.target.value }); }} placeholder="Search Things" /></label><details className="calm-filter"><summary><SlidersHorizontal size={15} />Filter{filterCount ? <span>{filterCount}</span> : null}</summary><div><label>Status<select value={later ? "active" : filter} onChange={(event) => { const value = event.target.value as ThingFilter; setFilter(value); updateUrl({ filter: value }); }}>{statusFilters.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</select></label><label>Sort<select value={sort} onChange={(event) => { setSort(event.target.value); updateUrl({ sort: event.target.value }); }}><option value="recent">Recently moved</option><option value="upcoming">Upcoming</option><option value="blocked">Waiting first</option><option value="alpha">Alphabetical</option></select></label></div></details></div>
    <nav className="calm-tabs" aria-label="Thing views"><button aria-current={!later ? "page" : undefined} className={!later ? "active" : ""} onClick={() => switchView("active")}>Active</button><button aria-current={later ? "page" : undefined} className={later ? "active" : ""} onClick={() => switchView("later")}>Later</button></nav>
    <div className="things-list calm-things-list">{filtered.map((thing) => { const params = new URLSearchParams({ filter }); if (query) params.set("q", query); if (sort !== "recent") params.set("sort", sort); return <ThingRow key={thing.id} thing={thing} href={`/things/${thing.id}?returnTo=${encodeURIComponent(`/things?${params}`)}`} onEdit={() => setEditing(thing)} />; })}</div>
    {!filtered.length ? <EmptyState title="Nothing here." body={later ? "Saved-for-later and finished Things will live here." : "Try another filter or start a new Thing."} action={<button className="button quiet" onClick={() => setEditing("new")}>New Thing</button>} /> : null}
    {editing ? <ThingEditor thing={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} onSaved={(id) => { if (editing === "new" && id) router.push(`/things/${id}`); }} /> : null}
  </div>;
}
