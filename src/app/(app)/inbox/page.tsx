"use client";

import { useRef, useState } from "react";
import { ArrowRight, Check, File, Image as ImageIcon, Link2, Mic, Paperclip, RotateCcw, Send, Sparkles, Type, X } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { EmptyState, PageHeader, PermissionBadge, StatusBadge } from "@/components/ui";
import { captureSchema, type InboxItem } from "@/lib/domain";
import { formatDate } from "@/lib/format";

const captureTypes = [
  { value: "text", label: "Type", icon: Type },
  { value: "voice", label: "Voice", icon: Mic },
  { value: "photo", label: "Photo", icon: ImageIcon },
  { value: "link", label: "Link", icon: Link2 },
  { value: "file", label: "File", icon: File },
] as const;

export default function InboxPage() {
  const { inbox, capture, acceptProposal, dismissInbox } = useApp();
  const [type, setType] = useState<InboxItem["type"]>("text");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const raw = text || (fileName ? `${type === "voice" ? "Voice note" : type === "photo" ? "Photo" : "File"}: ${fileName}` : "");
    const parsed = captureSchema.safeParse({ text: raw, type });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Add a thought first.");
    const result = await capture(raw, type, fileName || undefined);
    if (!result.ok) return setError(result.message);
    setText(""); setFileName(""); setError(""); setNotice(result.message);
  }

  const reviews = inbox.filter((item) => item.status === "needs_review");
  const processed = inbox.filter((item) => item.status !== "needs_review");

  return (
    <div className="page inbox-page">
      <PageHeader eyebrow="Capture now · shape later" title="Inbox" intro="No categories, priorities, or project forms. Start with whatever is in your head." />
      <form className="capture-composer" onSubmit={submit}>
        <div className="capture-heading"><div className="capture-mark"><Sparkles size={17} /></div><div><p className="eyebrow">Drop it here</p><h2>What are you thinking about?</h2></div></div>
        <textarea aria-label="What are you thinking about?" placeholder={type === "link" ? "Paste a link and add whatever you noticed…" : type === "voice" ? "Upload audio, or type the voice note transcript as a fallback…" : type === "photo" || type === "file" ? "Add a note about this attachment…" : "A trip, something to buy, someone to follow up with…"} value={text} onChange={(event) => setText(event.target.value)} />
        {fileName && <div className="attachment-chip"><Paperclip size={14} /><span>{fileName}</span><button type="button" onClick={() => setFileName("")} aria-label="Remove attachment"><X size={14} /></button></div>}
        <input ref={fileInput} className="sr-only" type="file" aria-label="Upload private attachment" accept={type === "photo" ? "image/*" : type === "voice" ? "audio/*" : undefined} onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} />
        <div className="capture-bottom">
          <div className="capture-types" role="group" aria-label="Capture type">{captureTypes.map(({ value, label, icon: Icon }) => <button type="button" key={value} className={type === value ? "active" : ""} onClick={() => { setType(value); setError(""); if (["photo", "file", "voice"].includes(value)) setTimeout(() => fileInput.current?.click(), 0); }}><Icon size={16} /><span>{label}</span></button>)}</div>
          <button className="button primary" type="submit"><Send size={15} />Save to Inbox</button>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {notice && <p className="form-success" role="status"><Check size={15} />{notice}</p>}
      </form>

      <section className="inbox-section" aria-labelledby="review-title">
        <div className="section-heading"><div><p className="eyebrow">Structure with a light touch</p><h2 id="review-title">Ready to review <span>{reviews.length}</span></h2></div><p>Nothing becomes a Thing until you say so.</p></div>
        {reviews.length ? <div className="proposal-list">{reviews.map((item) => <article key={item.id} className="proposal-card">
          <div className="proposal-source">
            <div className="proposal-icon">{item.type === "voice" ? <Mic /> : item.type === "link" ? <Link2 /> : item.type === "photo" ? <ImageIcon /> : item.type === "file" ? <File /> : <Type />}</div>
            <div><p className="eyebrow">Original {item.type} · {formatDate(item.createdAt)}</p><p>{item.raw}</p>{item.fileName && <small>{item.fileName} · private demo metadata</small>}</div>
          </div>
          {item.proposal && <div className="proposal-review">
            <div className="proposal-title-line"><div><span className="ai-label"><Sparkles size={12} /> Suggested Thing</span><h3>{item.proposal.title}</h3></div><span className={item.proposal.confidence === "High confidence" ? "confidence high" : "confidence"}>{item.proposal.confidence}</span></div>
            <p>{item.proposal.summary}</p>
            <div className="proposal-badges"><span>{item.proposal.category}</span><StatusBadge status={item.proposal.status} /><PermissionBadge permission={item.proposal.permission} /></div>
            {item.proposal.extracted.length > 0 && <ul>{item.proposal.extracted.map((value) => <li key={value}><Check size={13} />{value}</li>)}</ul>}
            <div className="proposal-actions">
              {item.proposal.relatedThingId ? <button className="button primary" onClick={async () => setNotice((await acceptProposal(item.id, "attach")).message)}>Attach to Camping <ArrowRight size={15} /></button> : <button className="button primary" onClick={async () => setNotice((await acceptProposal(item.id, "create")).message)}>Create Thing <ArrowRight size={15} /></button>}
              <button className="button quiet" onClick={() => setNotice("Kept in Inbox. Nothing changed.")}>Keep in Inbox</button>
              <button className="icon-button" onClick={async () => setNotice((await dismissInbox(item.id)).message)} aria-label="Dismiss proposal"><X size={17} /></button>
            </div>
          </div>}
        </article>)}</div> : <EmptyState title="Everything is reviewed." body="New captures will wait here with their original source intact." />}
      </section>
      {processed.length > 0 && <details className="processed-inbox"><summary>Recently processed <span>{processed.length}</span></summary><div>{processed.map((item) => <p key={item.id}>{item.proposal?.title ?? item.raw} <span>{item.status}</span></p>)}</div></details>}
      <div className="integration-note"><RotateCcw size={16} /><span><strong>AI provider disconnected.</strong> Deterministic review still works; audio transcription will become available when a provider is connected.</span></div>
    </div>
  );
}
