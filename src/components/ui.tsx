"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  Copy,
  Flame,
  MoreHorizontal,
  Pencil,
  Sparkles,
  Trash2,
} from "lucide-react";
import { displayStatus, type Approval, type Thing, type ThingStatus } from "@/lib/domain";
import { formatDateRange } from "@/lib/format";
import { useApp } from "./app-provider";

export function PageHeader({
  eyebrow,
  title,
  intro,
  action,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {intro && <p className="page-intro">{intro}</p>}
      </div>
      {action && <div className="page-action">{action}</div>}
    </header>
  );
}

export function StatusBadge({ status }: { status: ThingStatus }) {
  const label = displayStatus(status);
  return (
    <span className={`status-badge status-${label.toLowerCase().replace(/\s/g, "-")}`}>
      <i />
      {label}
    </span>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <Sparkles size={22} />
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}

export function ApprovalCard({
  approval,
  compact = false,
  onResolved,
}: {
  approval: Approval;
  compact?: boolean;
  onResolved?: (message: string) => void;
}) {
  const { resolveApproval, updateApproval, role, things } = useApp();
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(approval.title);
  const [responding, setResponding] = useState<"reject" | "question" | "alternatives" | null>(null);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const thing = things.find((item) => item.id === approval.thingId);

  async function resolve(status: Approval["status"], responseReason?: string, responseNote?: string) {
    setPending(true);
    const result = await resolveApproval(approval.id, status, responseReason, responseNote);
    setPending(false);
    onResolved?.(result.message);
    if (result.ok) { setResponding(null); setReason(""); setNote(""); }
  }

  async function saveEdit() {
    setPending(true);
    const result = await updateApproval(
      approval.id,
      title,
      approval.recommendation,
    );
    setPending(false);
    if (result.ok) setEditing(false);
    onResolved?.(result.message);
  }

  return (
    <article className={`approval-card calm-approval ${compact ? "compact" : ""}`}>
      {thing ? <Link className="approval-thing" href={`/things/${approval.thingId}`}>{thing.title}</Link> : null}
      <h3>{approval.title}</h3>
      <p className="approval-choice">{approval.options?.[0]?.label ?? approval.context}</p>
      <p className="approval-meta">{approval.amount !== undefined ? `$${approval.amount.toLocaleString()} ${approval.currency ?? "USD"}` : approval.meta}</p>
      <blockquote><strong>Maria</strong><p>“{approval.recommendation}”</p></blockquote>
      <div className="approval-actions">
        <button className="button primary" onClick={() => resolve("approved")} disabled={role !== "owner" || pending}><Check size={16} />Approve</button>
        <button className="button quiet" onClick={() => setResponding("reject")} disabled={role !== "owner" || pending}>Pass</button>
      </div>
      <details className="approval-disclosure"><summary>Why? <span>·</span> Other options</summary><div className="approval-detail-copy"><p>{approval.context}</p><p><strong>Why now:</strong> {approval.whyNow}</p>{approval.options && approval.options.length > 1 ? <div className="approval-options">{approval.options.slice(1).map((option) => <div key={option.id}><strong>{option.label}</strong>{option.description ? <p>{option.description}</p> : null}</div>)}</div> : null}<div className="approval-secondary-actions"><button onClick={() => void resolve("held", "Save for later")}>Save for later</button><button onClick={() => setResponding("question")}>Ask Maria</button><button onClick={() => setEditing(!editing)}>Edit decision</button><Link href={`/things/${approval.thingId}`}>Open Thing</Link></div>{editing ? <div className="approval-edit"><label>Decision wording<input value={title} onChange={(event) => setTitle(event.target.value)} /></label><button className="button quiet" onClick={saveEdit} disabled={pending || !title.trim()}>Save edit</button></div> : null}</div></details>
      {responding ? <div className="approval-response"><strong>{responding === "reject" ? "Want to tell Maria why?" : "What should Maria clarify?"}</strong>{responding === "reject" ? <div className="reason-chips">{["Too expensive", "Wrong look", "Not needed", "Bad timing", "Keep looking", "Other"].map((item) => <button type="button" className={reason === item ? "active" : ""} key={item} onClick={() => setReason(item)}>{item}</button>)}</div> : null}<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional" /><div className="compact-actions"><button className="button quiet" onClick={() => setResponding(null)}>Cancel</button><button className="button primary" onClick={() => void resolve(responding === "reject" ? "rejected" : "held", reason || (responding === "question" ? "Question asked" : "Alternatives requested"), note)}>{responding === "reject" ? "Pass" : "Send"}</button></div></div> : null}
      {role !== "owner" && (
        <p className="permission-note">Prepared for Jerry.</p>
      )}
    </article>
  );
}

export function ThingRow({
  thing,
  href,
  onEdit,
}: {
  thing: Thing;
  href?: string;
  onEdit?: () => void;
}) {
  const { role, archiveThing, duplicateThing } = useApp();
  const exceptional = displayStatus(thing.status) === "Needs You" ? "Needs you" : undefined;
  return (
    <article className="thing-row calm-thing-row">
      <Link
        href={href ?? `/things/${thing.id}`}
        className="thing-row-hit"
        aria-label={`Open ${thing.title}`}
      />
      <div className="thing-row-main">
        <div className="thing-row-title"><h2>{thing.title}</h2>{exceptional ? <em>{exceptional}</em> : null}{thing.keepMoving ? <Flame size={13} aria-label="Keep this moving" /> : null}{thing.surpriseMe ? <Sparkles size={13} aria-label="Surprise me" /> : null}</div>
        <p>{role === "owner" ? (thing.ownerNextAction || thing.summary) : (thing.assistantNextAction || thing.summary)}</p>
      </div>
      <div className="thing-row-meta">
        {thing.dates[0] ? <span>{formatDateRange(thing.dates[0].start, thing.dates[0].end, thing.dates[0].precision)}</span> : null}
      </div>
      <details className="thing-row-more"><summary aria-label={`More actions for ${thing.title}`}><MoreHorizontal size={17} /></summary><div>{onEdit ? <button onClick={onEdit}><Pencil size={13} />Edit</button> : null}<button onClick={() => void duplicateThing(thing.id)}><Copy size={13} />Duplicate</button>{role === "owner" && !thing.archived ? <button onClick={() => void archiveThing(thing.id)}><Trash2 size={13} />Archive</button> : null}</div></details>
      <ArrowRight className="thing-row-arrow" size={17} />
    </article>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  icon,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  description?: string;
  icon?: "flame" | "sparkles";
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`toggle-control ${checked ? "on" : ""}`}
      onClick={onChange}
    >
      <span className="toggle-copy">
        {icon === "flame" ? (
          <Flame size={16} />
        ) : icon === "sparkles" ? (
          <Sparkles size={16} />
        ) : null}
        <span>
          <strong>{label}</strong>
          {description && <small>{description}</small>}
        </span>
      </span>
      <span className="switch-track">
        <i />
      </span>
    </button>
  );
}
