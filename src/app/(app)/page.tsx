"use client";

import Link from "next/link";
import { ArrowRight, Check, CheckCircle2, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useApp } from "@/components/app-provider";
import { formatDateRange } from "@/lib/format";
import { relativeTime } from "@/lib/plan";

export default function HomePage() {
  const app = useApp();
  const { approvals, activities, things, renderedAt } = app;
  const [notice, setNotice] = useState("");
  const pending = approvals.filter((item) => item.status === "pending");
  const recent = useMemo(() => activities.filter((activity) => activity.actor === "Maria").slice(0, 6), [activities]);
  const upcoming = things.flatMap((thing) => thing.archived ? [] : thing.dates.map((date) => ({ thing, date }))).filter(({ date }) => date.start >= renderedAt.slice(0, 10)).sort((a, b) => a.date.start.localeCompare(b.date.start));
  const currentDate = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date(renderedAt));

  async function approve(id: string) {
    const result = await app.resolveApproval(id, "approved");
    setNotice(result.message);
  }

  return <div className="page home-page plan-home">
    <header className="home-hero"><div><p className="home-date">{currentDate}</p><h1>Good evening, Jerry.</h1></div><Link href="/inbox" className="button primary"><Plus size={16} />Capture</Link></header>
    {notice ? <div className="toast" role="status"><CheckCircle2 size={17} />{notice}<button onClick={() => setNotice("")} aria-label="Dismiss notification">×</button></div> : null}

    <section className="home-work-section recent-work" aria-labelledby="recent-work-title">
      <div className="calm-section-title"><div><p className="section-kicker">From Maria</p><h2 id="recent-work-title">Recently moved</h2></div><Link href="/assistant">Maria’s day<ArrowRight size={14} /></Link></div>
      <div className="recent-work-list">{recent.map((activity) => { const thing = things.find((candidate) => candidate.id === activity.thingId); if (!thing) return null; const itemQuery = activity.entityType === "item" ? `?item=${encodeURIComponent(activity.entityId ?? "")}` : ""; return <Link href={`/things/${thing.id}${itemQuery}`} key={activity.id}><span className="recent-dot" /><span><strong>{thing.title}</strong><small>{activity.text.replace(/^Maria\s+/i, "")}</small></span><time>{relativeTime(activity.at, renderedAt)}</time><ArrowRight size={15} /></Link>; })}</div>
    </section>

    <section className="home-work-section compact-needs" aria-labelledby="needs-you-title">
      <div className="calm-section-title"><h2 id="needs-you-title">Needs you</h2>{pending.length ? <Link href="/things?filter=needs-you">All {pending.length}<ArrowRight size={14} /></Link> : null}</div>
      {pending.length ? <div className="decision-list">{pending.slice(0, 3).map((approval) => { const thing = things.find((candidate) => candidate.id === approval.thingId); return <article key={approval.id}><Link href={`/things/${approval.thingId}`}><small>{thing?.title}</small><strong>{approval.title}</strong><p>{approval.options?.[0]?.label ?? approval.context}</p></Link><button className="decision-approve" onClick={() => void approve(approval.id)} aria-label={`Approve ${approval.title}`}><Check size={15} />Approve</button></article>; })}</div> : <p className="calm-empty-line">You’re clear. Maria can keep moving.</p>}
    </section>

    <section className="home-work-section" aria-labelledby="coming-title">
      <div className="calm-section-title"><h2 id="coming-title">Coming up</h2><Link href="/calendar">Calendar<ArrowRight size={14} /></Link></div>
      <div className="calm-upcoming-list">{upcoming.slice(0, 4).map(({ thing, date }) => <Link href={`/things/${thing.id}`} key={`${thing.id}-${date.label}`}><time>{formatDateRange(date.start, date.end, date.precision)}</time><span><strong>{thing.title}</strong><small>{date.readiness}</small></span>{thing.status === "Needs You" ? <em>Needs you</em> : null}</Link>)}</div>
    </section>
  </div>;
}
