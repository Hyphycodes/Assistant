"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, RotateCcw, Save, X } from "lucide-react";
import { useApp } from "./app-provider";
import {
  categoryValues,
  permissionValues,
  statusValues,
  thingEditSchema,
  type Thing,
  type ThingEditInput,
} from "@/lib/domain";

function initialValues(thing?: Thing): ThingEditInput {
  return {
    title: thing?.title ?? "",
    summary: thing?.summary ?? "",
    ownerNextAction: thing?.ownerNextAction ?? "",
    assistantNextAction: thing?.assistantNextAction ?? "",
    category: thing?.category ?? "Personal",
    status: thing?.status ?? "Exploring",
    permission: thing?.permission ?? "GO",
    location: thing?.location ?? "",
    keepMoving: thing?.keepMoving ?? false,
    surpriseMe: thing?.surpriseMe ?? false,
    date: thing?.dates[0],
  };
}

export function ThingEditor({
  thing,
  onClose,
  onSaved,
}: {
  thing?: Thing;
  onClose: () => void;
  onSaved?: (id?: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { createThing, updateThing, role } = useApp();
  const [baseline] = useState(() => initialValues(thing));
  const [values, setValues] = useState(baseline);
  const [dateEnabled, setDateEnabled] = useState(Boolean(values.date));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  const dirty = JSON.stringify(values) !== JSON.stringify(baseline);
  const set = <K extends keyof ThingEditInput>(key: K, value: ThingEditInput[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  function reset() {
    setValues(baseline);
    setDateEnabled(Boolean(baseline.date));
    setError("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const input = { ...values, date: dateEnabled ? values.date : undefined };
    const parsed = thingEditSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the form and try again.");
      return;
    }
    setPending(true);
    setError("");
    const result = thing
      ? await updateThing(thing.id, parsed.data)
      : await createThing(parsed.data);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onSaved?.(result.id ?? thing?.id);
    onClose();
  }

  const ownerLocked = role === "assistant" && Boolean(thing);
  const date = values.date ?? {
    label: "Target date",
    start: new Date(Date.UTC(2026, 11, 1, 18)).toISOString(),
    precision: "exact" as const,
    readiness: "Planning is underway",
    unresolved: 0,
  };

  return (
    <dialog
      ref={dialogRef}
      className="editor-dialog"
      aria-labelledby="thing-editor-title"
      onCancel={(event) => {
        if (dirty && !window.confirm("Discard your unsaved changes?")) event.preventDefault();
        else onClose();
      }}
    >
      <form onSubmit={submit} className="editor-form">
        <header className="editor-header">
          <div><p className="eyebrow">{thing ? "Make the record useful" : "Start an open loop"}</p><h2 id="thing-editor-title">{thing ? "Edit Thing" : "New Thing"}</h2></div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close editor"><X /></button>
        </header>
        <div className="editor-scroll">
          {ownerLocked && <p className="permission-note">Maria can update operational fields here. Jerry controls the title, category, and permission.</p>}
          <fieldset>
            <legend>Core brief</legend>
            <label className="field wide">Title<input autoFocus value={values.title} disabled={ownerLocked} onChange={(event) => set("title", event.target.value)} required /></label>
            <label className="field wide">Snapshot<textarea value={values.summary} onChange={(event) => set("summary", event.target.value)} rows={4} /></label>
            <label className="field wide">Owner next action<input value={values.ownerNextAction} onChange={(event) => set("ownerNextAction", event.target.value)} /></label>
            <label className="field wide">Assistant next action<input value={values.assistantNextAction} onChange={(event) => set("assistantNextAction", event.target.value)} /></label>
            <label className="field">Category<select value={values.category} disabled={ownerLocked} onChange={(event) => set("category", event.target.value as ThingEditInput["category"])}>{categoryValues.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label className="field">Status<select value={values.status} onChange={(event) => set("status", event.target.value as ThingEditInput["status"])}>{statusValues.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label className="field">Permission<select value={values.permission} disabled={ownerLocked} onChange={(event) => set("permission", event.target.value as ThingEditInput["permission"])}>{permissionValues.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label className="field">Location<input value={values.location ?? ""} onChange={(event) => set("location", event.target.value)} /></label>
          </fieldset>
          <fieldset>
            <legend>Operating signals</legend>
            <label className="check-field"><input type="checkbox" checked={values.keepMoving} onChange={(event) => set("keepMoving", event.target.checked)} />Keep this moving</label>
            <label className="check-field"><input type="checkbox" checked={values.surpriseMe} onChange={(event) => set("surpriseMe", event.target.checked)} />Surprise me</label>
          </fieldset>
          <fieldset>
            <legend>Context date</legend>
            <label className="check-field wide"><input type="checkbox" checked={dateEnabled} onChange={(event) => setDateEnabled(event.target.checked)} />Attach a date with readiness context</label>
            {dateEnabled && <>
              <label className="field">Label<input value={date.label} onChange={(event) => set("date", { ...date, label: event.target.value })} /></label>
              <label className="field">Date<input type="datetime-local" value={date.start.slice(0, 16)} onChange={(event) => set("date", { ...date, start: new Date(event.target.value).toISOString() })} /></label>
              <label className="field">Precision<select value={date.precision} onChange={(event) => set("date", { ...date, precision: event.target.value as typeof date.precision })}><option value="exact">Exact</option><option value="range">Range</option><option value="month">Month</option><option value="unknown">Unknown</option></select></label>
              <label className="field">Open items<input type="number" min="0" value={date.unresolved} onChange={(event) => set("date", { ...date, unresolved: Number(event.target.value) })} /></label>
              <label className="field wide">Readiness<input value={date.readiness} onChange={(event) => set("date", { ...date, readiness: event.target.value })} /></label>
            </>}
          </fieldset>
          {error && <p className="form-error" role="alert">{error}</p>}
        </div>
        <footer className="editor-footer">
          <button type="button" className="button quiet" onClick={reset} disabled={!dirty || pending}><RotateCcw size={15} />Reset</button>
          <span />
          <button type="button" className="button quiet" onClick={onClose} disabled={pending}>Cancel</button>
          <button type="submit" className="button primary" disabled={pending || !values.title.trim()}>{pending ? <LoaderCircle className="spin" size={15} /> : <Save size={15} />}{pending ? "Saving…" : "Save Thing"}</button>
        </footer>
      </form>
    </dialog>
  );
}
