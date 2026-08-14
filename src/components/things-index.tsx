"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { ThingEditor } from "@/components/thing-editor";
import { EmptyState, PageHeader, ThingRow } from "@/components/ui";
import { categoryValues, thingFilterValues, type Category, type Thing, type ThingFilter } from "@/lib/domain";

const labels: Record<ThingFilter, string> = {
  active: "All active", "needs-you": "Needs You", moving: "In Motion",
  waiting: "Waiting", ready: "Ready", someday: "Someday", done: "Done",
};

export function ThingsIndex({ initialFilter, initialQuery, initialCategory, initialSort }: {
  initialFilter: ThingFilter; initialQuery: string; initialCategory: string; initialSort: string;
}) {
  const router = useRouter();
  const { things, approvals, activities } = useApp();
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<Category | "All">(categoryValues.includes(initialCategory as Category) ? initialCategory as Category : "All");
  const [filter, setFilter] = useState(initialFilter);
  const [sort, setSort] = useState(["recent", "upcoming", "alpha", "blocked"].includes(initialSort) ? initialSort : "recent");
  const [editing, setEditing] = useState<Thing | "new" | null>(null);

  function updateUrl(next: { filter?: ThingFilter; query?: string; category?: Category | "All"; sort?: string }) {
    const values = { filter, query, category, sort, ...next };
    const params = new URLSearchParams();
    params.set("filter", values.filter);
    if (values.query) params.set("q", values.query);
    if (values.category !== "All") params.set("category", values.category);
    if (values.sort !== "recent") params.set("sort", values.sort);
    router.replace(`/things?${params.toString()}`, { scroll: false });
  }

  const filtered = useMemo(() => things.filter((thing) => {
    const pending = approvals.some((approval) => approval.thingId === thing.id && approval.status === "pending");
    const matchesFilter = filter === "active" ? !thing.archived && !["Done", "Someday"].includes(thing.status)
      : filter === "needs-you" ? !thing.archived && (thing.status === "Needs You" || thing.permission === "YOU" || pending)
      : filter === "moving" ? !thing.archived && ["Moving", "Exploring"].includes(thing.status)
      : filter === "done" ? thing.archived || thing.status === "Done"
      : !thing.archived && thing.status.toLowerCase() === filter;
    if (!matchesFilter) return false;
    if (query && !`${thing.title} ${thing.summary} ${thing.ownerNextAction} ${thing.assistantNextAction} ${thing.category}`.toLowerCase().includes(query.toLowerCase())) return false;
    return category === "All" || thing.category === category;
  }).sort((a, b) => sort === "alpha" ? a.title.localeCompare(b.title)
    : sort === "upcoming" ? (a.dates[0]?.start ?? "9999").localeCompare(b.dates[0]?.start ?? "9999")
    : sort === "blocked" ? Number(Boolean(b.waitingOn)) - Number(Boolean(a.waitingOn))
    : b.lastMoved.localeCompare(a.lastMoved)), [things, approvals, query, category, filter, sort]);

  return <div className="page">
    <PageHeader eyebrow="Living open loops" title="Things" intro="Every open loop, with the exact next move visible." action={<button className="button primary" onClick={() => setEditing("new")}><Plus size={16} />New Thing</button>} />
    <nav className="thing-filter-tabs" aria-label="Thing views">{thingFilterValues.map((value) => <button key={value} aria-current={filter === value ? "page" : undefined} className={filter === value ? "active" : ""} onClick={() => { setFilter(value); updateUrl({ filter: value }); }}>{labels[value]}</button>)}</nav>
    <div className="filter-bar">
      <label className="search-field"><Search size={17} /><span className="sr-only">Search Things</span><input value={query} onChange={(event) => { setQuery(event.target.value); updateUrl({ query: event.target.value }); }} placeholder="Search title, brief, or next action" /></label>
      <label><span className="sr-only">Category</span><select value={category} onChange={(event) => { const value = event.target.value as Category | "All"; setCategory(value); updateUrl({ category: value }); }}><option>All</option>{categoryValues.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label className="sort-control"><SlidersHorizontal size={15} /><span className="sr-only">Sort</span><select value={sort} onChange={(event) => { setSort(event.target.value); updateUrl({ sort: event.target.value }); }}><option value="recent">Recently moved</option><option value="upcoming">Upcoming</option><option value="blocked">Blocked first</option><option value="alpha">Alphabetical</option></select></label>
    </div>
    <div className="result-line"><span>{filtered.length} {filtered.length === 1 ? "Thing" : "Things"}</span><span><Sparkles size={13} /> {things.filter((thing) => thing.keepMoving && !thing.archived).length} kept moving</span></div>
    <div className="things-list">{filtered.map((thing) => {
      const pending = approvals.filter((item) => item.thingId === thing.id && item.status === "pending").length;
      const movement = activities.filter((item) => item.thingId === thing.id).length;
      const open = thing.dates.reduce((sum, date) => sum + date.unresolved, 0);
      const params = new URLSearchParams({ filter });
      if (query) params.set("q", query);
      if (category !== "All") params.set("category", category);
      if (sort !== "recent") params.set("sort", sort);
      return <ThingRow key={thing.id} thing={thing} href={`/things/${thing.id}?returnTo=${encodeURIComponent(`/things?${params}`)}`} counts={`${pending} decisions · ${open} unresolved · ${thing.links.length} links · ${thing.options.length} options · ${thing.notes.length} notes · ${movement} updates`} onEdit={() => setEditing(thing)} />;
    })}</div>
    {!filtered.length && <EmptyState title="No Things found." body="Try another view or start a new Thing." action={<button className="button quiet" onClick={() => setEditing("new")}>New Thing</button>} />}
    {editing && <ThingEditor thing={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} onSaved={(id) => { if (editing === "new" && id) router.push(`/things/${id}`); }} />}
  </div>;
}
