"use client";

import { Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useApp } from "@/components/app-provider";
import { EmptyState, PageHeader, ThingRow } from "@/components/ui";
import { categoryValues, statusValues, type Category, type ThingStatus } from "@/lib/domain";

export default function ThingsPage() {
  const { things } = useApp();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "All">("All");
  const [status, setStatus] = useState<ThingStatus | "Active" | "All">("Active");
  const [sort, setSort] = useState("recent");

  const filtered = useMemo(() => things.filter((thing) => {
    if (thing.archived) return false;
    if (query && !`${thing.title} ${thing.summary} ${thing.category}`.toLowerCase().includes(query.toLowerCase())) return false;
    if (category !== "All" && thing.category !== category) return false;
    if (status === "Active" && ["Done", "Someday"].includes(thing.status)) return false;
    if (status !== "All" && status !== "Active" && thing.status !== status) return false;
    return true;
  }).sort((a, b) => sort === "alpha" ? a.title.localeCompare(b.title) : sort === "upcoming" ? (a.dates[0]?.start ?? "9999").localeCompare(b.dates[0]?.start ?? "9999") : b.lastMoved.localeCompare(a.lastMoved)), [things, query, category, status, sort]);

  return (
    <div className="page">
      <PageHeader eyebrow="Living open loops" title="Things" intro="Trips, questions, purchases, plans, and ideas—kept flexible enough to become what they need to be." />
      <div className="filter-bar">
        <label className="search-field"><Search size={17} /><span className="sr-only">Search Things</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Things" /></label>
        <label><span className="sr-only">Category</span><select value={category} onChange={(event) => setCategory(event.target.value as Category | "All")}><option>All</option>{categoryValues.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label><span className="sr-only">Status</span><select value={status} onChange={(event) => setStatus(event.target.value as ThingStatus | "Active" | "All")}><option>Active</option><option>All</option>{statusValues.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className="sort-control"><SlidersHorizontal size={15} /><span className="sr-only">Sort</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="recent">Recently moved</option><option value="upcoming">Upcoming</option><option value="alpha">Alphabetical</option></select></label>
      </div>
      <div className="result-line"><span>{filtered.length} {filtered.length === 1 ? "Thing" : "Things"}</span><span><Sparkles size={13} /> {things.filter((thing) => thing.keepMoving && !thing.archived).length} kept moving</span></div>
      <div className="things-list">{filtered.map((thing) => <ThingRow thing={thing} key={thing.id} />)}</div>
      {!filtered.length && <EmptyState title="No Things found." body="Try clearing a filter or capture a new thought without organizing it first." />}
    </div>
  );
}
