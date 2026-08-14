"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowDown, ArrowUp, Copy, CornerDownRight, Plus, RotateCcw, Trash2 } from "lucide-react";
import { customFieldTypeValues, displayStatus, type CustomField, type Thing, type ThingItem } from "@/lib/domain";
import { useApp } from "./app-provider";
import { ThingEditor } from "./thing-editor";

const itemTypes: ThingItem["type"][] = ["note", "action", "idea", "product", "decision", "link", "person", "place", "event", "reservation", "file", "checklist"];

function FieldInput({ field, onSave }: { field: CustomField; onSave: (value: unknown) => void }) {
  if (field.type === "checkbox") return <input aria-label={field.label} type="checkbox" checked={Boolean(field.value)} onChange={(event) => onSave(event.target.checked)} />;
  if (field.type === "long_text") return <textarea aria-label={field.label} defaultValue={String(field.value ?? "")} onBlur={(event) => onSave(event.target.value)} />;
  if (field.type === "select" || field.type === "status") return <select aria-label={field.label} value={String(field.value ?? "")} onChange={(event) => onSave(event.target.value)}><option value="">Choose…</option>{field.options?.map((option) => <option key={option}>{option}</option>)}</select>;
  return <input aria-label={field.label} type={field.type === "number" || field.type === "currency" ? "number" : field.type === "date" ? "date" : field.type === "url" ? "url" : "text"} defaultValue={String(field.value ?? "")} onBlur={(event) => onSave(field.type === "number" || field.type === "currency" ? Number(event.target.value) : event.target.value)} />;
}

export function ThingWorkspace({ thing, onMessage }: { thing: Thing; onMessage: (message: string) => void }) {
  const app = useApp();
  const [sectionTitle, setSectionTitle] = useState("");
  const [itemTitle, setItemTitle] = useState("");
  const [itemType, setItemType] = useState<ThingItem["type"]>("action");
  const [itemSection, setItemSection] = useState("");
  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldType, setFieldType] = useState<(typeof customFieldTypeValues)[number]>("short_text");
  const [fieldOptions, setFieldOptions] = useState("");
  const [newChild, setNewChild] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const children = app.things.filter((candidate) => candidate.parentId === thing.id && !candidate.archived);
  const parent = thing.parentId ? app.things.find((candidate) => candidate.id === thing.parentId) : undefined;
  const sections = thing.sections.filter((section) => showArchived || !section.archived).sort((a, b) => a.position - b.position);
  const items = thing.items.filter((item) => showArchived || !item.archived).sort((a, b) => a.position - b.position);

  async function resultMessage(result: Promise<{ message: string }>) { onMessage((await result).message); }

  return <>
    <section className="detail-section object-section" id="structure">
      <div className="detail-section-heading"><div><p className="eyebrow">Shape the work</p><h2>Sections & items</h2></div><button className="button quiet" onClick={() => setShowArchived((value) => !value)}><RotateCcw size={14} />{showArchived ? "Hide archived" : "Show archived"}</button></div>
      <form className="inline-form compact-form" onSubmit={(event) => { event.preventDefault(); if (!sectionTitle.trim()) return; void resultMessage(app.addSection(thing.id, sectionTitle.trim())).then(() => setSectionTitle("")); }}>
        <label>New section<input value={sectionTitle} onChange={(event) => setSectionTitle(event.target.value)} placeholder="Itinerary, products, contacts…" /></label><button className="button quiet"><Plus size={14} />Add section</button>
      </form>
      <div className="section-stack">
        {sections.map((section) => <article className={`workspace-section ${section.archived ? "is-archived" : ""}`} key={section.id}>
          <div className="workspace-section-head">
            <div><input aria-label="Section title" defaultValue={section.title} onBlur={(event) => { if (event.target.value !== section.title) void resultMessage(app.updateSection(thing.id, section.id, event.target.value, section.body)); }} /><textarea aria-label={`${section.title} description`} defaultValue={section.body} placeholder="Add section context…" onBlur={(event) => { if (event.target.value !== section.body) void resultMessage(app.updateSection(thing.id, section.id, section.title, event.target.value)); }} /></div>
            <div className="compact-actions">
              {!section.archived && <><button aria-label="Move section up" onClick={() => void resultMessage(app.moveSection(thing.id, section.id, "up"))}><ArrowUp size={14} /></button><button aria-label="Move section down" onClick={() => void resultMessage(app.moveSection(thing.id, section.id, "down"))}><ArrowDown size={14} /></button><button aria-label="Duplicate section" onClick={() => void resultMessage(app.duplicateSection(thing.id, section.id))}><Copy size={14} /></button><button aria-label="Archive section" onClick={() => void resultMessage(app.removeSection(thing.id, section.id))}><Trash2 size={14} /></button></>}
              {section.archived && <button onClick={() => void resultMessage(app.restoreSection(thing.id, section.id))}><RotateCcw size={14} /> Restore</button>}
            </div>
          </div>
          <div className="item-stack">{items.filter((item) => item.sectionId === section.id).map((item) => <ItemRow key={item.id} item={item} thing={thing} onMessage={onMessage} />)}{!items.some((item) => item.sectionId === section.id) && <p className="subtle-empty">No items in this section.</p>}</div>
        </article>)}
      </div>
      <form className="inline-form item-composer" onSubmit={(event) => { event.preventDefault(); if (!itemTitle.trim()) return; void resultMessage(app.addItem(thing.id, { title: itemTitle.trim(), type: itemType, sectionId: itemSection || undefined })).then(() => setItemTitle("")); }}>
        <label>Item<input value={itemTitle} onChange={(event) => setItemTitle(event.target.value)} placeholder="Add an action, note, product…" /></label>
        <label>Type<select value={itemType} onChange={(event) => setItemType(event.target.value as ThingItem["type"])}>{itemTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
        <label>Section<select value={itemSection} onChange={(event) => setItemSection(event.target.value)}><option value="">Unsectioned</option>{thing.sections.filter((section) => !section.archived).map((section) => <option value={section.id} key={section.id}>{section.title}</option>)}</select></label>
        <button className="button primary"><Plus size={14} />Add item</button>
      </form>
      {items.filter((item) => !item.sectionId).map((item) => <ItemRow key={item.id} item={item} thing={thing} onMessage={onMessage} />)}
    </section>

    <section className="detail-section" id="fields">
      <div className="detail-section-heading"><div><p className="eyebrow">Your object, your vocabulary</p><h2>Custom fields</h2></div></div>
      <div className="custom-field-grid">{thing.customFields.map((field) => <label className="field" key={field.id}><span>{field.label}<button aria-label={`Remove ${field.label}`} onClick={() => void resultMessage(app.removeCustomField(thing.id, field.id))}>×</button></span><FieldInput field={field} onSave={(value) => void resultMessage(app.updateCustomField(thing.id, field.id, value))} /></label>)}</div>
      {!thing.customFields.length && <p className="subtle-empty">No custom fields yet. Add only what this Thing needs.</p>}
      <form className="inline-form compact-form" onSubmit={(event) => { event.preventDefault(); if (!fieldLabel.trim()) return; void resultMessage(app.addCustomField(thing.id, fieldLabel.trim(), fieldType, fieldOptions.split(",").map((item) => item.trim()).filter(Boolean))).then(() => { setFieldLabel(""); setFieldOptions(""); }); }}>
        <label>Field name<input value={fieldLabel} onChange={(event) => setFieldLabel(event.target.value)} /></label><label>Type<select value={fieldType} onChange={(event) => setFieldType(event.target.value as typeof fieldType)}>{customFieldTypeValues.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}</select></label>{(fieldType === "select" || fieldType === "multi_select" || fieldType === "status") && <label>Options<input value={fieldOptions} onChange={(event) => setFieldOptions(event.target.value)} placeholder="Option A, Option B" /></label>}<button className="button quiet"><Plus size={14} />Add field</button>
      </form>
    </section>

    <section className="detail-section" id="subthings">
      <div className="detail-section-heading"><div><p className="eyebrow">Nested, never lost</p><h2>Subthings & relationships</h2></div><button className="button quiet" onClick={() => setNewChild(true)}><Plus size={14} />New subthing</button></div>
      {parent && <p className="relationship-line"><CornerDownRight size={14} />Part of <Link href={`/things/${parent.id}`}>{parent.title}</Link> <button onClick={() => void resultMessage(app.moveSubthing(thing.id, null))}>Promote</button></p>}
      <div className="relationship-list">{children.map((child) => <Link href={`/things/${child.id}`} key={child.id}><span>{child.title}</span><small>{displayStatus(child.status)}</small></Link>)}</div>
      {!children.length && <p className="subtle-empty">No subthings yet.</p>}
      {thing.relatedThingIds?.length ? <div className="related-things"><strong>Related</strong>{thing.relatedThingIds.map((relatedId) => { const related = app.things.find((candidate) => candidate.id === relatedId); return related ? <Link href={`/things/${related.id}`} key={related.id}>{related.title}</Link> : null; })}</div> : null}
      <label className="field">Connect contact<select value="" onChange={(event) => { if (event.target.value) void resultMessage(app.attachContact(thing.id, event.target.value)); }}><option value="">Choose a person…</option>{app.contacts.filter((contact) => !contact.archived && !thing.contacts.some((linked) => linked.id === contact.id)).map((contact) => <option key={contact.id} value={contact.id}>{contact.name} · {contact.context}</option>)}</select></label>
      <label className="field">Move under<select value={thing.parentId ?? ""} onChange={(event) => void resultMessage(app.moveSubthing(thing.id, event.target.value || null))}><option value="">Top level</option>{app.things.filter((candidate) => candidate.id !== thing.id && !candidate.archived).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.title}</option>)}</select></label>
      {newChild && <ThingEditor parentId={thing.id} onClose={() => setNewChild(false)} onSaved={() => setNewChild(false)} />}
    </section>
  </>;
}

function ItemRow({ item, thing, onMessage }: { item: ThingItem; thing: Thing; onMessage: (message: string) => void }) {
  const app = useApp();
  async function show(result: Promise<{ message: string }>) { onMessage((await result).message); }
  return <div className={`workspace-item ${item.archived ? "is-archived" : ""}`}><span className="item-type">{item.type}</span><input aria-label={`${item.type} title`} defaultValue={item.title} onBlur={(event) => { if (event.target.value !== item.title) void show(app.updateItem(thing.id, item.id, { title: event.target.value })); }} /><select aria-label="Item section" value={item.sectionId ?? ""} onChange={(event) => void show(app.updateItem(thing.id, item.id, { sectionId: event.target.value || null }))}><option value="">Unsectioned</option>{thing.sections.filter((section) => !section.archived).map((section) => <option key={section.id} value={section.id}>{section.title}</option>)}</select>{item.archived ? <button onClick={() => void show(app.restoreItem(thing.id, item.id))}><RotateCcw size={13} />Restore</button> : <button aria-label={`Archive ${item.title}`} onClick={() => void show(app.removeItem(thing.id, item.id))}><Trash2 size={13} /></button>}</div>;
}
