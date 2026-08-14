"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  Clock3,
  Flame,
  Pencil,
  Sparkles,
} from "lucide-react";
import type { Approval, Permission, Thing, ThingStatus } from "@/lib/domain";
import { formatDateRange, relativeMovement } from "@/lib/format";
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
  return (
    <span
      className={`status-badge status-${status.toLowerCase().replace(/\s/g, "-")}`}
    >
      <i />
      {status}
    </span>
  );
}

export function PermissionBadge({ permission }: { permission: Permission }) {
  return (
    <span className={`permission-badge permission-${permission.toLowerCase()}`}>
      {permission}
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
    <article className={`approval-card ${compact ? "compact" : ""}`}>
      <div className="approval-topline">
        <Link href={`/things/${approval.thingId}`}>{thing?.title}</Link>
        <PermissionBadge permission={thing?.permission ?? "APPROVE"} />
      </div>
      <h3>{approval.title}</h3>
      <p className="approval-context">{approval.context}</p>
      <div className="recommendation">
        <span>My take</span>
        <p>{approval.recommendation}</p>
      </div>
      {!compact && (
        <p className="why-now">
          <Clock3 size={14} />
          <span>
            <strong>Why now:</strong> {approval.whyNow}
          </span>
        </p>
      )}
      <p className="approval-meta">{approval.meta}</p>
      {approval.amount !== undefined && <p className="approval-amount">${approval.amount.toLocaleString()} {approval.currency ?? "USD"} · {approval.urgency ?? "normal"} urgency</p>}
      {approval.options?.length ? <div className="approval-options">{approval.options.map((option, index) => <div key={option.id}><span>{index === 0 ? "Recommended" : `Alternative ${index}`}</span><strong>{option.label}</strong>{option.description && <p>{option.description}</p>}</div>)}</div> : null}
      {thing && (
        <p className="approval-next">
          <strong>Owner next:</strong> {thing.ownerNextAction}
        </p>
      )}
      {editing && (
        <div className="approval-edit">
          <label>
            Decision wording
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <button
            className="button quiet"
            onClick={saveEdit}
            disabled={pending || !title.trim()}
          >
            Save edit
          </button>
        </div>
      )}
      <div className="approval-actions">
        <button
          className="button primary"
          onClick={() => resolve("approved")}
          disabled={role !== "owner" || pending}
        >
          <Check size={16} />
          {approval.actionLabel}
        </button>
        <button
          className="button quiet"
          onClick={() => resolve("held", "Save for later")}
          disabled={role !== "owner" || pending}
        >
          Hold
        </button>
        <button
          className="button quiet"
          onClick={() => setResponding("reject")}
          disabled={role !== "owner" || pending}
        >
          Reject
        </button>
        <button
          className="button quiet"
          onClick={() => setEditing(!editing)}
          disabled={role !== "owner" || pending}
        >
          <Pencil size={14} />
          Edit
        </button>
        <button className="button quiet" onClick={() => setResponding("question")} disabled={role !== "owner" || pending}>Ask a question</button>
        <button className="button quiet" onClick={() => setResponding("alternatives")} disabled={role !== "owner" || pending}>Show alternatives</button>
        <Link className="text-link" href={`/things/${approval.thingId}`}>
          Open Thing <ArrowRight size={14} />
        </Link>
      </div>
      {responding && <div className="approval-response"><strong>{responding === "reject" ? "Why isn’t this right?" : responding === "question" ? "What should Maria clarify?" : "What should the alternatives change?"}</strong>{responding === "reject" && <div className="reason-chips">{["Too expensive", "Wrong style", "Bad timing", "Not needed", "Other"].map((item) => <button type="button" className={reason === item ? "active" : ""} key={item} onClick={() => setReason(item)}>{item}</button>)}</div>}<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional context so the next recommendation is better" /><div className="compact-actions"><button className="button quiet" onClick={() => setResponding(null)}>Cancel</button><button className="button primary" disabled={responding === "reject" && !reason} onClick={() => void resolve(responding === "reject" ? "rejected" : "held", responding === "reject" ? reason : responding === "question" ? "Question asked" : "Alternatives requested", note)}>Send response</button></div></div>}
      {role !== "owner" && (
        <p className="permission-note">
          Prepared for Jerry · only the owner can resolve this.
        </p>
      )}
    </article>
  );
}

export function ThingRow({
  thing,
  href,
  counts,
  onEdit,
}: {
  thing: Thing;
  href?: string;
  counts?: string;
  onEdit?: () => void;
}) {
  const { role, renderedAt } = useApp();
  return (
    <article className="thing-row">
      <Link
        href={href ?? `/things/${thing.id}`}
        className="thing-row-hit"
        aria-label={`Open ${thing.title}`}
      />
      <div className="thing-row-main">
        <div className="thing-row-title">
          <h2>{thing.title}</h2>
          {thing.keepMoving && (
            <Flame size={14} aria-label="Keep this moving" />
          )}
          {thing.surpriseMe && <Sparkles size={14} aria-label="Surprise me" />}
        </div>
        <p>{thing.summary}</p>
        <p className="thing-next-action">
          <strong>
            {role === "owner" ? "Your next move" : "Assistant next"}:
          </strong>{" "}
          {role === "owner" ? thing.ownerNextAction : thing.assistantNextAction}
        </p>
        {thing.waitingOn && (
          <p className="thing-blocker">
            <strong>Waiting on:</strong> {thing.waitingOn}
          </p>
        )}
        {counts && <small>{counts}</small>}
      </div>
      <div className="thing-row-meta">
        <StatusBadge status={thing.status} />
        <span>
          {thing.dates[0]
            ? formatDateRange(
                thing.dates[0].start,
                thing.dates[0].end,
                thing.dates[0].precision,
              )
            : "No fixed date"}
        </span>
        <span>{relativeMovement(thing.lastMoved, renderedAt)}</span>
      </div>
      {onEdit ? (
        <button
          className="icon-button thing-row-edit"
          onClick={onEdit}
          aria-label={`Edit ${thing.title}`}
        >
          <Pencil size={16} />
        </button>
      ) : (
        <ArrowRight className="thing-row-arrow" size={17} />
      )}
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
