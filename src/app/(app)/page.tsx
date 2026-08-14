"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, MoveUpRight, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useApp } from "@/components/app-provider";
import { ApprovalCard, EmptyState, StatusBadge } from "@/components/ui";
import { daysUntil, formatDateRange } from "@/lib/format";

export default function HomePage() {
  const { approvals, activities, things, role } = useApp();
  const [notice, setNotice] = useState("");
  const pending = approvals.filter((item) => item.status === "pending");
  const upcoming = things.flatMap((thing) => thing.archived ? [] : thing.dates.map((date) => ({ thing, date }))).sort((a, b) => a.date.start.localeCompare(b.date.start));
  const ideas = things.filter((thing) => !thing.archived && thing.status === "Someday");
  const todayActivity = useMemo(() => activities.slice(0, 5), [activities]);
  const currentDate = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date());

  return (
    <div className="page home-page">
      <header className="home-hero">
        <div><p className="eyebrow">{currentDate}</p><h1>{role === "owner" ? "Good evening, Jerry." : "Good evening, Maria."}</h1><p>{role === "owner" ? "A few small decisions will unlock a lot of movement." : "The studio is in good shape. Here’s where your attention is useful."}</p></div>
        <Link href="/inbox" className="button primary"><Sparkles size={16} />Capture a thought</Link>
      </header>
      {notice && <div className="toast" role="status"><CheckCircle2 size={17} />{notice}<button onClick={() => setNotice("")} aria-label="Dismiss notification">×</button></div>}

      <section className="home-section needs-you-section" aria-labelledby="needs-you-title">
        <div className="section-heading">
          <div><p className="eyebrow">Your call</p><h2 id="needs-you-title">Needs you <span>{pending.length}</span></h2></div>
          <p>Prepared decisions, distilled to what matters.</p>
        </div>
        {pending.length ? <div className="approval-grid">{pending.slice(0, 2).map((approval) => <ApprovalCard key={approval.id} approval={approval} onResolved={setNotice} />)}</div> : <EmptyState title="Nothing needs a decision right now." body="Maria has room to keep moving without you." />}
        {pending.length > 2 && <Link href="/things?filter=needs-you" className="section-link">See all {pending.length} decisions <ArrowRight size={15} /></Link>}
      </section>

      <div className="home-columns">
        <section className="home-section" aria-labelledby="moved-title">
          <div className="section-heading compact"><div><p className="eyebrow">Momentum</p><h2 id="moved-title">Moved today</h2></div><MoveUpRight size={19} /></div>
          <div className="activity-list">
            {todayActivity.map((activity) => {
              const thing = things.find((item) => item.id === activity.thingId);
              return <Link href={`/things/${activity.thingId}`} className="activity-item" key={activity.id}><span className="activity-dot" /><span><strong>{thing?.title}</strong><p>{activity.text}</p></span><ArrowRight size={14} /></Link>;
            })}
          </div>
          <Link href="/archive" className="section-link">Open full activity <ArrowRight size={15} /></Link>
        </section>

        <section className="home-section" aria-labelledby="coming-title">
          <div className="section-heading compact"><div><p className="eyebrow">Readiness</p><h2 id="coming-title">Coming up</h2></div><CalendarDays size={19} /></div>
          <div className="upcoming-list">
            {upcoming.slice(0, 4).map(({ thing, date }) => (
              <Link href={`/things/${thing.id}`} className="upcoming-item" key={`${thing.id}-${date.label}`}>
                <div className="date-tile"><strong>{new Intl.DateTimeFormat("en-US", { day: "numeric" }).format(new Date(date.start))}</strong><span>{new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(date.start))}</span></div>
                <div><div className="upcoming-title"><strong>{thing.title}</strong><StatusBadge status={thing.status} /></div><p>{date.readiness}</p><small><Clock3 size={12} /> {date.precision === "month" ? formatDateRange(date.start, undefined, "month") : daysUntil(date.start)} · {date.unresolved} open</small></div>
              </Link>
            ))}
          </div>
          <Link href="/calendar" className="section-link">See readiness calendar <ArrowRight size={15} /></Link>
        </section>
      </div>

      <section className="home-section revisit-section" aria-labelledby="revisit-title">
        <div className="section-heading"><div><p className="eyebrow">Still alive</p><h2 id="revisit-title">Ideas to revisit</h2></div><p>No pressure. Just the right ideas staying warm.</p></div>
        <div className="idea-strip">{ideas.map((thing) => <Link href={`/things/${thing.id}`} key={thing.id} className="idea-card"><div>{thing.surpriseMe && <span className="idea-signal"><Sparkles size={13} /> Surprise me</span>}<h3>{thing.title}</h3><p>{thing.summary}</p></div><span>Open Thing <ArrowRight size={14} /></span></Link>)}</div>
      </section>
    </div>
  );
}
