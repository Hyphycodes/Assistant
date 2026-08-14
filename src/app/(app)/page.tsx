"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useApp } from "@/components/app-provider";
import { ApprovalCard } from "@/components/ui";
import { formatDateRange } from "@/lib/format";

export default function HomePage() {
  const { approvals, activities, things, renderedAt } = useApp();
  const [notice, setNotice] = useState("");
  const pending = approvals.filter((item) => item.status === "pending");
  const upcoming = things.flatMap((thing) => thing.archived ? [] : thing.dates.map((date) => ({ thing, date }))).filter(({ date }) => date.start >= renderedAt.slice(0, 10)).sort((a, b) => a.date.start.localeCompare(b.date.start));
  const movedCount = useMemo(() => new Set(activities.slice(0, 8).map((activity) => activity.thingId)).size, [activities]);
  const currentDate = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date(renderedAt));

  return <div className="page home-page calm-home">
    <header className="home-hero"><div><p className="home-date">{currentDate}</p><h1>Good evening, Jerry.</h1></div><Link href="/inbox" className="button primary"><Plus size={16} />Capture</Link></header>
    {notice ? <div className="toast" role="status"><CheckCircle2 size={17} />{notice}<button onClick={() => setNotice("")} aria-label="Dismiss notification">×</button></div> : null}

    <section className="home-decisions" aria-labelledby="needs-you-title"><h2 id="needs-you-title">Needs you</h2>{pending.length ? <>
      <div className="approval-grid calm-approval-grid">{pending.slice(0, 3).map((approval) => <ApprovalCard key={approval.id} approval={approval} onResolved={setNotice} />)}</div>
      {pending.length > 3 ? <Link className="home-more-link" href="/things?filter=needs-you">All {pending.length} decisions<ArrowRight size={14} /></Link> : null}
    </> : <div className="clear-state"><h3>Nothing needs you right now.</h3><p>Maria can keep everything moving without you.</p></div>}</section>

    {upcoming.length ? <section className="home-aside" aria-labelledby="coming-title">
      <h2 id="coming-title">Coming up</h2>
      <div className="home-aside-list">{upcoming.slice(0, 3).map(({ thing, date }) => <Link href={`/things/${thing.id}`} key={`${thing.id}-${date.label}`}><time>{formatDateRange(date.start, date.end, date.precision)}</time><span>{thing.title}</span></Link>)}</div>
      <Link className="home-more-link" href="/calendar">Calendar<ArrowRight size={14} /></Link>
    </section> : null}

    {movedCount ? <p className="home-activity-line">Maria worked on {movedCount} {movedCount === 1 ? "thing" : "things"} today.</p> : null}
  </div>;
}
