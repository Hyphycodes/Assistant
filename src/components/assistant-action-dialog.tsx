"use client";

import { useEffect, useRef, useState } from "react";
import { Check, LoaderCircle, X } from "lucide-react";
import { useApp } from "./app-provider";
import type { Thing } from "@/lib/domain";

export type WorkbenchAction = "movement" | "follow-up" | "link" | "option" | "approval";

const labels: Record<WorkbenchAction, string> = {
  movement: "Record movement",
  "follow-up": "Prepare follow-up",
  link: "Add source link",
  option: "Add an option",
  approval: "Prepare owner decision",
};

export function AssistantActionDialog({ thing, action, onClose, onDone }: {
  thing: Thing; action: WorkbenchAction; onClose: () => void; onDone: (message: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const app = useApp();
  const [primary, setPrimary] = useState("");
  const [secondary, setSecondary] = useState("");
  const [tertiary, setTertiary] = useState("");
  const [date, setDate] = useState(new Date(new Date(app.renderedAt).getTime() + 3 * 86_400_000).toISOString().slice(0, 16));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true); setError("");
    const result = action === "movement"
      ? await app.recordMovement({ thingId: thing.id, update: primary, nextAction: secondary || undefined })
      : action === "follow-up"
        ? await app.addFollowUp({ thingId: thing.id, waitingOn: primary, date: new Date(date).toISOString(), channel: secondary || undefined, note: tertiary || undefined, state: "drafted" })
        : action === "link"
          ? await app.addLink(thing.id, primary, secondary)
          : action === "option"
            ? await app.addOption(thing.id, { name: primary, description: secondary, recommendation: tertiary || undefined })
            : await app.createApproval({ thingId: thing.id, title: primary, recommendation: secondary, whyNow: tertiary || "This decision unlocks the next useful move.", context: thing.summary, actionLabel: "Approve", meta: "Prepared in the assistant workbench", permission: thing.permission === "YOU" ? "YOU" : "APPROVE" });
    setPending(false);
    if (!result.ok) { setError(result.message); return; }
    onDone(result.message); onClose();
  }

  return <dialog ref={dialogRef} className="action-dialog" aria-labelledby="action-dialog-title" onCancel={onClose}>
    <form onSubmit={submit}>
      <header><div><p className="eyebrow">{thing.title}</p><h2 id="action-dialog-title">{labels[action]}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close"><X /></button></header>
      <div className="action-dialog-fields">
        <label>{action === "movement" ? "What changed" : action === "follow-up" ? "Waiting on" : action === "link" ? "Link title" : action === "option" ? "Option name" : "Decision needed"}<input autoFocus value={primary} onChange={(event) => setPrimary(event.target.value)} required /></label>
        {action === "follow-up" && <label>Follow-up date<input type="datetime-local" value={date} onChange={(event) => setDate(event.target.value)} required /></label>}
        <label>{action === "movement" ? "New assistant next action" : action === "follow-up" ? "Channel" : action === "link" ? "URL" : action === "option" ? "Description" : "Recommendation"}<input type={action === "link" ? "url" : "text"} value={secondary} onChange={(event) => setSecondary(event.target.value)} required={action === "link" || action === "approval"} placeholder={action === "link" ? "https://" : undefined} /></label>
        {!["movement", "link"].includes(action) && <label>{action === "follow-up" ? "Draft note" : action === "option" ? "Why it fits" : "Why now"}<textarea value={tertiary} onChange={(event) => setTertiary(event.target.value)} rows={4} /></label>}
        {action === "follow-up" && <p className="permission-note">This records a drafted follow-up and date. It does not send a message.</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
      <footer><button className="button quiet" type="button" onClick={onClose}>Cancel</button><button className="button primary" disabled={pending}>{pending ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />}{pending ? "Saving…" : "Save"}</button></footer>
    </form>
  </dialog>;
}
