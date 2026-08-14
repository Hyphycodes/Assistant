"use client";

import { Check, LayoutTemplate, Plus } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/app-provider";
import { PageHeader } from "@/components/ui";
import { ThingEditor } from "@/components/thing-editor";

export default function TemplatesPage() {
  const app = useApp();
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sections, setSections] = useState("");
  const [notice, setNotice] = useState("");

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const result = await app.createTemplate({ name, description, type: "blank", sections: sections.split(",").map((title) => title.trim()).filter(Boolean).map((title) => ({ title })), fields: [] });
    setNotice(result.message);
    if (result.ok) { setCreating(false); setName(""); setDescription(""); setSections(""); }
  }

  return <div className="page">
    <PageHeader eyebrow="Start with shape, not ceremony" title="Templates" intro="Reusable structures for recurring work. Applying one creates a real editable Thing." action={<button className="button primary" onClick={() => setCreating((value) => !value)}><Plus size={14} />New template</button>} />
    {notice && <div className="inline-notice"><Check size={14} />{notice}</div>}
    {creating && <form className="panel-form" onSubmit={save}><label>Name<input required value={name} onChange={(event) => setName(event.target.value)} /></label><label>Description<input value={description} onChange={(event) => setDescription(event.target.value)} /></label><label className="wide">Sections, comma-separated<input value={sections} onChange={(event) => setSections(event.target.value)} placeholder="Context, Next actions, Budget" /></label><div className="wide compact-actions"><button type="button" className="button quiet" onClick={() => setCreating(false)}>Cancel</button><button className="button primary">Save template</button></div></form>}
    <div className="template-grid">{app.templates.filter((template) => !template.archived).map((template) => <article key={template.id}><LayoutTemplate size={20} /><h2>{template.name}</h2><p>{template.description}</p><small>{template.sections.length} sections · {template.fields.length} fields</small><button className="button quiet" onClick={() => setTemplateId(template.id)}><Plus size={14} />Use template</button></article>)}</div>
    {templateId && <ThingEditor templateId={templateId} onClose={() => setTemplateId(null)} onSaved={() => setTemplateId(null)} />}
  </div>;
}
