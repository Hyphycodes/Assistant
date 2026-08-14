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
  const movedThings = useMemo(() => Array.from(new Set(activities.slice(0, 8).map((activity) => activity.thingId))).map((id) => things.find((thing) => thing.id === id)).filter(Boolean), [activities, things]);
  const currentDate = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date(renderedAt));

  return <div className="page home-page calm-home">
    <header className="home-hero"><div><p className="home-date">{currentDate}</p><h1>Good evening, Jerry.</h1></div><Link href="/inbox" className="button primary"><Plus size={16} />Capture</Link></header>
    {notice ? <div className="toast" role="status"><CheckCircle2 size={17} />{notice}<button onClick={() => setNotice("")} aria-label="Dismiss notification">×</button></div> : null}

    <section className="calm-home-section" aria-labelledby="needs-you-title"><div className="calm-section-title"><h2 id="needs-you-title">Needs you</h2>{pending.length > 2 ? <Link href="/things?filter=needs-you">All {pending.length}<ArrowRight size={14} /></Link> : null}</div>{pending.length ? <div className="approval-grid calm-approval-grid">{pending.slice(0, 2).map((approval) => <ApprovalCard key={approval.id} approval={approval} onResolved={setNotice} />)}</div> : <div className="clear-state"><h3>You’re clear.</h3><p>Maria can keep moving without you.</p></div>}</section>

    <section className="calm-home-section" aria-labelledby="coming-title"><div className="calm-section-title"><h2 id="coming-title">Coming up</h2><Link href="/calendar">Calendar<ArrowRight size={14} /></Link></div><div className="calm-upcoming-list">{upcoming.slice(0, 4).map(({ thing, date }) => <Link href={`/things/${thing.id}`} key={`${thing.id}-${date.label}`}><time>{formatDateRange(date.start, date.end, date.precision)}</time><span><strong>{thing.title}</strong><small>{date.unresolved > 0 ? `${date.unresolved} ${date.unresolved === 1 ? "thing" : "things"} left` : date.readiness}</small></span>{thing.status === "Needs You" ? <em>Needs you</em> : null}</Link>)}</div></section>

    <section className="calm-home-section maria-moved" aria-labelledby="moved-title"><div><span className="avatar avatar-assistant">M</span><div><h2 id="moved-title">Maria moved {movedThings.length} things today.</h2><p>{movedThings.slice(0, 3).map((thing) => thing?.title.replace(" — Red Oak", "")).join(" · ")}{movedThings.length > 3 ? ` +${movedThings.length - 3}` : ""}</p></div></div><details><summary>See activity</summary><div>{activities.slice(0, 6).map((activity) => <Link href={`/things/${activity.thingId}`} key={activity.id}>{activity.text}<ArrowRight size={13} /></Link>)}</div></details></section>
  </div>;
}
