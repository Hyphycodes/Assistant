"use client";

import Link from "next/link";
import { ArrowRight, Check, Clock3, Flame, Sparkles } from "lucide-react";
import type { Approval, Permission, Thing, ThingStatus } from "@/lib/domain";
import { formatDateRange, relativeMovement } from "@/lib/format";
import { useApp } from "./app-provider";

export function PageHeader({ eyebrow, title, intro, action }: { eyebrow?: string; title: string; intro?: string; action?: React.ReactNode }) {
  return (
    <header className="page-header">
      <div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{intro && <p className="page-intro">{intro}</p>}</div>
      {action && <div className="page-action">{action}</div>}
    </header>
  );
}

export function StatusBadge({ status }: { status: ThingStatus }) {
  return <span className={`status-badge status-${status.toLowerCase().replace(/\s/g, "-")}`}><i />{status}</span>;
}

export function PermissionBadge({ permission }: { permission: Permission }) {
  return <span className={`permission-badge permission-${permission.toLowerCase()}`}>{permission}</span>;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return <div className="empty-state"><Sparkles size={22} /><h3>{title}</h3><p>{body}</p>{action}</div>;
}

export function ApprovalCard({ approval, compact = false, onResolved }: { approval: Approval; compact?: boolean; onResolved?: (message: string) => void }) {
  const { resolveApproval, role, things } = useApp();
  const thing = things.find((item) => item.id === approval.thingId);

  function resolve(status: Approval["status"]) {
    const ok = resolveApproval(approval.id, status);
    onResolved?.(ok ? (status === "approved" ? "Approved. Maria can keep this moving." : status === "held" ? "Held for later." : "Declined and recorded.") : "Only the owner can resolve this decision.");
  }

  return (
    <article className={`approval-card ${compact ? "compact" : ""}`}>
      <div className="approval-topline">
        <Link href={`/things/${approval.thingId}`}>{thing?.title}</Link>
        <PermissionBadge permission={thing?.permission ?? "APPROVE"} />
      </div>
      <h3>{approval.title}</h3>
      <p className="approval-context">{approval.context}</p>
      <div className="recommendation"><span>My take</span><p>{approval.recommendation}</p></div>
      {!compact && <p className="why-now"><Clock3 size={14} /><span><strong>Why now:</strong> {approval.whyNow}</span></p>}
      <p className="approval-meta">{approval.meta}</p>
      <div className="approval-actions">
        <button className="button primary" onClick={() => resolve("approved")} disabled={role !== "owner"}><Check size={16} />{approval.actionLabel}</button>
        <button className="button quiet" onClick={() => resolve("held")} disabled={role !== "owner"}>Hold</button>
        <Link className="text-link" href={`/things/${approval.thingId}`}>Open Thing <ArrowRight size={14} /></Link>
      </div>
      {role !== "owner" && <p className="permission-note">Prepared for Jerry · only the owner can resolve this.</p>}
    </article>
  );
}

export function ThingRow({ thing }: { thing: Thing }) {
  return (
    <Link href={`/things/${thing.id}`} className="thing-row">
      <div className="thing-row-main">
        <div className="thing-row-title"><h3>{thing.title}</h3>{thing.keepMoving && <Flame size={14} aria-label="Keep this moving" />}{thing.surpriseMe && <Sparkles size={14} aria-label="Surprise me" />}</div>
        <p>{thing.summary}</p>
      </div>
      <div className="thing-row-meta">
        <StatusBadge status={thing.status} />
        <span>{thing.dates[0] ? formatDateRange(thing.dates[0].start, thing.dates[0].end, thing.dates[0].precision) : "No fixed date"}</span>
        <span>{relativeMovement(thing.lastMoved)}</span>
      </div>
      <ArrowRight className="thing-row-arrow" size={17} />
    </Link>
  );
}

export function Toggle({ checked, onChange, label, description, icon }: { checked: boolean; onChange: () => void; label: string; description?: string; icon?: "flame" | "sparkles" }) {
  return (
    <button type="button" role="switch" aria-checked={checked} className={`toggle-control ${checked ? "on" : ""}`} onClick={onChange}>
      <span className="toggle-copy">{icon === "flame" ? <Flame size={16} /> : icon === "sparkles" ? <Sparkles size={16} /> : null}<span><strong>{label}</strong>{description && <small>{description}</small>}</span></span>
      <span className="switch-track"><i /></span>
    </button>
  );
}
