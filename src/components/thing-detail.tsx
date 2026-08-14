"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  CircleAlert,
  Clock3,
  Link2,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  Save,
  Send,
  Trash2,
  UserRound,
} from "lucide-react";
import { useApp } from "./app-provider";
import { ThingEditor } from "./thing-editor";
import {
  ApprovalCard,
  EmptyState,
  PermissionBadge,
  StatusBadge,
  Toggle,
} from "./ui";
import { statusValues, type ThingStatus } from "@/lib/domain";
import { formatDate, formatDateRange } from "@/lib/format";

export function ThingDetail({
  id,
  returnTo = "/things",
}: {
  id: string;
  returnTo?: string;
}) {
  const app = useApp();
  const { things, approvals, activities, role } = app;
  const thing = things.find((item) => item.id === id);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [showStatus, setShowStatus] = useState(false);
  const [editingThing, setEditingThing] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<string | null>(null);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [optionOpen, setOptionOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<string | null>(null);
  const [optionName, setOptionName] = useState("");
  const [optionDescription, setOptionDescription] = useState("");
  const thingApprovals = approvals.filter(
    (approval) => approval.thingId === id && approval.status === "pending",
  );
  const thingActivity = useMemo(
    () => activities.filter((activity) => activity.thingId === id),
    [activities, id],
  );

  if (!thing)
    return (
      <div className="page">
        <EmptyState
          title="This Thing isn’t here."
          body="It may have moved into the archive or been removed from this demo."
          action={
            <Link href="/things" className="button quiet">
              Back to Things
            </Link>
          }
        />
      </div>
    );
  const ownerName = role === "owner" ? "Jerry" : "Maria";

  async function submitNote(event: React.FormEvent) {
    event.preventDefault();
    if (!note.trim()) return;
    const result = await app.addNote(id, note.trim());
    setMessage(result.message);
    if (result.ok) setNote("");
  }

  async function changeStatus(status: ThingStatus) {
    const result = await app.setThingStatus(id, status);
    setMessage(result.message);
    setShowStatus(false);
  }

  async function saveSection(sectionId: string, title: string) {
    const result = await app.updateSection(id, sectionId, title, draft);
    setMessage(result.message);
    if (result.ok) setEditingSection(null);
  }

  async function saveNote(noteId: string) {
    const result = await app.updateNote(id, noteId, draft);
    setMessage(result.message);
    if (result.ok) setEditingNote(null);
  }

  async function addLink(event: React.FormEvent) {
    event.preventDefault();
    const result = editingLink
      ? await app.updateLink(id, editingLink, linkTitle, linkUrl)
      : await app.addLink(id, linkTitle, linkUrl);
    setMessage(result.message);
    if (result.ok) {
      setLinkTitle("");
      setLinkUrl("");
      setLinkOpen(false);
      setEditingLink(null);
    }
  }

  async function addOption(event: React.FormEvent) {
    event.preventDefault();
    const current = thing?.options.find((option) => option.id === editingOption);
    const result = current
      ? await app.updateOption(id, current.id, {
          ...current,
          name: optionName,
          description: optionDescription,
        })
      : await app.addOption(id, {
          name: optionName,
          description: optionDescription,
        });
    setMessage(result.message);
    if (result.ok) {
      setOptionName("");
      setOptionDescription("");
      setOptionOpen(false);
      setEditingOption(null);
    }
  }

  return (
    <div className="page thing-detail-page">
      <Link href={returnTo} className="back-link">
        <ArrowLeft size={15} />
        Back to Things
      </Link>
      <header className="thing-header">
        <div className="thing-title-block">
          <div className="thing-kicker">
            <span>{thing.category}</span>
            <StatusBadge status={thing.status} />
            <PermissionBadge permission={thing.permission} />
          </div>
          <h1>{thing.title}</h1>
          {thing.location && (
            <p>
              <MapPin size={14} />
              {thing.location}
            </p>
          )}
        </div>
        <div className="thing-header-actions">
          <button
            className="button primary"
            onClick={() => setEditingThing(true)}
          >
            <Pencil size={15} />
            Edit Thing
          </button>
          <div className="status-menu">
            <button
              className="button quiet"
              onClick={() => setShowStatus(!showStatus)}
            >
              Change status <ChevronDown size={15} />
            </button>
            {showStatus && (
              <div className="status-popover">
                {statusValues.map((status) => (
                  <button
                    key={status}
                    disabled={status === thing.status}
                    onClick={() => changeStatus(status)}
                  >
                    {status}
                  </button>
                ))}
              </div>
            )}
          </div>
          <details className="more-menu">
            <summary className="icon-button" aria-label="More Thing actions">
              <MoreHorizontal />
            </summary>
            <div>
              <button
                disabled={role !== "owner"}
                onClick={async () => {
                  if (
                    window.confirm(
                      "Move this Thing to Archive? Its history will remain searchable.",
                    )
                  ) {
                    const result = await app.archiveThing(id);
                    setMessage(result.message);
                  }
                }}
              >
                <Trash2 size={15} />
                Archive Thing
              </button>
            </div>
          </details>
        </div>
      </header>
      <nav className="thing-subnav" aria-label="Thing sections">
        <a href="#overview">Overview</a>
        <a href="#decisions">
          Decisions <span>{thingApprovals.length}</span>
        </a>
        <a href="#links-options">
          Links & options{" "}
          <span>{thing.links.length + thing.options.length}</span>
        </a>
        <a href="#notes">
          Notes <span>{thing.notes.length}</span>
        </a>
        <a href="#activity">
          Activity <span>{thingActivity.length}</span>
        </a>
      </nav>
      {message && (
        <div className="inline-notice" role="status">
          <Check size={15} />
          {message}
          <button onClick={() => setMessage("")} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}
      <div className="thing-layout">
        <div className="thing-primary">
          <section id="overview" className="snapshot-card">
            <p className="eyebrow">The working brief</p>
            <p className="snapshot-copy">{thing.summary}</p>
            <div className="next-action-panel">
              <div>
                <span>Owner next</span>
                <strong>
                  {thing.ownerNextAction || "No owner action needed."}
                </strong>
              </div>
              <div>
                <span>Assistant next</span>
                <strong>
                  {thing.assistantNextAction || "No assistant action queued."}
                </strong>
              </div>
              {thing.waitingOn && (
                <div>
                  <span>Blocker</span>
                  <strong>Waiting on {thing.waitingOn}</strong>
                </div>
              )}
            </div>
            <small>
              Maintained from meaningful movement ·{" "}
              {formatDate(thing.lastMoved)}
            </small>
          </section>
          <section id="decisions" className="detail-section">
            <div className="detail-section-heading">
              <div>
                <p className="eyebrow">Prepared, not buried</p>
                <h2>Decisions</h2>
              </div>
              <CircleAlert size={18} />
            </div>
            {thingApprovals.length ? (
              <div className="detail-approvals">
                {thingApprovals.map((approval) => (
                  <ApprovalCard
                    approval={approval}
                    key={approval.id}
                    compact
                    onResolved={setMessage}
                  />
                ))}
              </div>
            ) : (
              <p className="subtle-empty">
                Nothing needs Jerry’s decision right now.
              </p>
            )}
          </section>
          {thing.sections.map((section) => (
            <section className="detail-section prose-section" key={section.id}>
              <div className="detail-section-heading">
                <div>
                  <p className="eyebrow">Context</p>
                  <h2>{section.title}</h2>
                </div>
                <button
                  className="icon-button"
                  onClick={() => {
                    setEditingSection(section.id);
                    setDraft(section.body);
                  }}
                  aria-label={`Edit ${section.title}`}
                >
                  <Pencil size={15} />
                </button>
              </div>
              {editingSection === section.id ? (
                <div className="inline-editor">
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                  />
                  <div>
                    <button
                      className="button quiet"
                      onClick={() => setEditingSection(null)}
                    >
                      Cancel
                    </button>
                    <button
                      className="button primary"
                      onClick={() => saveSection(section.id, section.title)}
                    >
                      <Save size={14} />
                      Save
                    </button>
                    <button
                      className="button quiet danger"
                      onClick={async () => {
                        const result = await app.removeSection(id, section.id);
                        setMessage(result.message);
                      }}
                    >
                      <Trash2 size={14} />
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <p>{section.body}</p>
              )}
            </section>
          ))}
          <section id="links-options" className="detail-section">
            <div className="detail-section-heading">
              <div>
                <p className="eyebrow">Evidence and choices</p>
                <h2>Links & options</h2>
              </div>
              <div className="compact-actions">
                <button
                  className="button quiet"
                  onClick={() => {
                    setEditingLink(null);
                    setLinkTitle("");
                    setLinkUrl("");
                    setLinkOpen(!linkOpen);
                  }}
                >
                  <Link2 size={14} />
                  Add link
                </button>
                <button
                  className="button quiet"
                  onClick={() => {
                    setEditingOption(null);
                    setOptionName("");
                    setOptionDescription("");
                    setOptionOpen(!optionOpen);
                  }}
                >
                  <Plus size={14} />
                  Add option
                </button>
              </div>
            </div>
            {linkOpen && (
              <form className="inline-form" onSubmit={addLink}>
                <label>
                  Link title
                  <input
                    value={linkTitle}
                    onChange={(event) => setLinkTitle(event.target.value)}
                    required
                  />
                </label>
                <label>
                  URL
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(event) => setLinkUrl(event.target.value)}
                    placeholder="https://"
                    required
                  />
                </label>
                <button className="button primary">
                  {editingLink ? "Update link" : "Save link"}
                </button>
              </form>
            )}
            {optionOpen && (
              <form className="inline-form" onSubmit={addOption}>
                <label>
                  Option name
                  <input
                    value={optionName}
                    onChange={(event) => setOptionName(event.target.value)}
                    required
                  />
                </label>
                <label>
                  Description
                  <input
                    value={optionDescription}
                    onChange={(event) =>
                      setOptionDescription(event.target.value)
                    }
                  />
                </label>
                <button className="button primary">
                  {editingOption ? "Update option" : "Save option"}
                </button>
              </form>
            )}
            <div className="link-list">
              {thing.links.map((item) => (
                <article key={item.id}>
                  <a href={item.url} target="_blank" rel="noreferrer">
                    <Link2 size={15} />
                    <span>
                      <strong>{item.title}</strong>
                      <small>{new URL(item.url).hostname}</small>
                    </span>
                    <ArrowUpRight size={14} />
                  </a>
                  <div>
                    <button
                      onClick={() => {
                        setEditingLink(item.id);
                        setLinkTitle(item.title);
                        setLinkUrl(item.url);
                        setLinkOpen(true);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={async () =>
                        setMessage((await app.removeLink(id, item.id)).message)
                      }
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))}
              {!thing.links.length && (
                <p className="subtle-empty">No source links yet.</p>
              )}
            </div>
            {thing.options.length > 0 && (
              <div className="option-grid">
                {thing.options.map((option, index) => (
                  <article
                    className={`option-card ${option.status === "recommended" ? "recommended" : ""}`}
                    key={option.id}
                  >
                    <div className={`option-art option-art-${index % 3}`}>
                      <span>
                        {option.name
                          .split(" ")
                          .slice(0, 2)
                          .map((word) => word[0])
                          .join("")}
                      </span>
                    </div>
                    <div className="option-body">
                      <div className="option-top">
                        {option.status === "recommended" && (
                          <span className="recommended-label">
                            Maria’s pick
                          </span>
                        )}
                        <span>{option.status}</span>
                      </div>
                      <h3>{option.name}</h3>
                      <p>{option.description}</p>
                      {option.price && (
                        <strong className="option-price">{option.price}</strong>
                      )}
                      {option.recommendation && (
                        <div className="option-take">
                          <span>Why it fits</span>
                          <p>{option.recommendation}</p>
                        </div>
                      )}
                      {option.tradeoff && (
                        <p className="tradeoff">
                          <strong>Tradeoff:</strong> {option.tradeoff}
                        </p>
                      )}
                      {option.source && (
                        <a
                          href={option.source}
                          target="_blank"
                          rel="noreferrer"
                          className="text-link"
                        >
                          Open source <ArrowUpRight size={13} />
                        </a>
                      )}
                      <div className="option-edit-actions">
                        <button
                          onClick={() => {
                            setEditingOption(option.id);
                            setOptionName(option.name);
                            setOptionDescription(option.description);
                            setOptionOpen(true);
                            document
                              .querySelector("#links-options")
                              ?.scrollIntoView({ behavior: "smooth" });
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={async () =>
                            setMessage(
                              (await app.removeOption(id, option.id)).message,
                            )
                          }
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
          <section id="notes" className="detail-section">
            <div className="detail-section-heading">
              <div>
                <p className="eyebrow">The thread</p>
                <h2>Notes & conversation</h2>
              </div>
              <MessageCircle size={18} />
            </div>
            <form className="note-composer" onSubmit={submitNote}>
              <label htmlFor="thing-note" className="sr-only">
                Add a note
              </label>
              <textarea
                id="thing-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={
                  role === "assistant"
                    ? "Add evidence, a follow-up, or what changed…"
                    : "Add context without organizing it…"
                }
              />
              <button className="button primary" type="submit">
                <Send size={14} />
                Add note
              </button>
            </form>
            <div className="note-list">
              {thing.notes.map((item) => (
                <article key={item.id}>
                  <span
                    className={`avatar ${item.author === "Jerry" ? "avatar-owner" : "avatar-assistant"}`}
                  >
                    {item.author[0]}
                  </span>
                  <div>
                    <div>
                      <strong>{item.author}</strong>
                      <small>
                        {formatDate(item.at, {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </small>
                    </div>
                    {editingNote === item.id ? (
                      <div className="inline-editor">
                        <textarea
                          value={draft}
                          onChange={(event) => setDraft(event.target.value)}
                        />
                        <div>
                          <button
                            className="button quiet"
                            onClick={() => setEditingNote(null)}
                          >
                            Cancel
                          </button>
                          <button
                            className="button primary"
                            onClick={() => saveNote(item.id)}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p>{item.body}</p>
                        {item.author === ownerName && (
                          <div className="note-actions">
                            <button
                              onClick={() => {
                                setEditingNote(item.id);
                                setDraft(item.body);
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={async () => {
                                const result = await app.deleteNote(
                                  id,
                                  item.id,
                                );
                                setMessage(result.message);
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </article>
              ))}
              {!thing.notes.length && (
                <p className="subtle-empty">No notes yet.</p>
              )}
            </div>
          </section>
          <section id="activity" className="detail-section">
            <div className="detail-section-heading">
              <div>
                <p className="eyebrow">Meaningful movement</p>
                <h2>Activity</h2>
              </div>
              <Clock3 size={18} />
            </div>
            <div className="detail-activity">
              {thingActivity.map((item) => (
                <article key={item.id}>
                  <span />
                  <div>
                    <p>{item.text}</p>
                    <small>
                      {formatDate(item.at, {
                        month: "long",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </small>
                  </div>
                </article>
              ))}
              {!thingActivity.length && (
                <p className="subtle-empty">
                  Movement will show up here in plain language.
                </p>
              )}
            </div>
          </section>
        </div>
        <aside className="thing-sidebar" aria-label="Supporting details">
          <section className="control-card">
            <p className="eyebrow">Operating permission</p>
            <PermissionBadge permission={thing.permission} />
            <p>
              {thing.permission === "GO"
                ? "Maria can research, organize, draft, and follow up without interrupting you."
                : thing.permission === "APPROVE"
                  ? "Maria prepares the action; Jerry resolves money or commitment."
                  : "Maria can prepare context, but Jerry personally handles the action."}
            </p>
          </section>
          <Toggle
            checked={thing.keepMoving}
            onChange={async () =>
              setMessage((await app.toggleThing(id, "keepMoving")).message)
            }
            label="Keep this moving"
            description="Surface a useful next step if this goes quiet."
            icon="flame"
          />
          <Toggle
            checked={thing.surpriseMe}
            onChange={async () =>
              setMessage((await app.toggleThing(id, "surpriseMe")).message)
            }
            label="Surprise me"
            description="Occasional low-risk ideas that fit the brief."
            icon="sparkles"
          />
          {thing.dates.length > 0 && (
            <section className="side-card">
              <p className="eyebrow">Dates</p>
              {thing.dates.map((date) => (
                <div className="side-date" key={date.id ?? date.label}>
                  <CalendarDays size={16} />
                  <div>
                    <strong>{date.label}</strong>
                    <p>
                      {formatDateRange(date.start, date.end, date.precision)}
                    </p>
                    <small>
                      {date.readiness} · {date.unresolved} open
                    </small>
                  </div>
                </div>
              ))}
            </section>
          )}
          {thing.contacts.length > 0 && (
            <section className="side-card">
              <p className="eyebrow">People</p>
              {thing.contacts.map((contact) => (
                <div className="side-contact" key={contact.id}>
                  <span className="contact-avatar">
                    <UserRound size={15} />
                  </span>
                  <div>
                    <strong>{contact.name}</strong>
                    <p>{contact.context}</p>
                    {contact.note && <small>{contact.note}</small>}
                  </div>
                </div>
              ))}
            </section>
          )}
          {thing.followUps.length > 0 && (
            <section className="side-card">
              <p className="eyebrow">Follow-ups</p>
              {thing.followUps.map((followUp) => (
                <div className="side-date" key={followUp.id}>
                  <Clock3 size={16} />
                  <div>
                    <strong>{followUp.waitingOn}</strong>
                    <p>
                      {formatDate(followUp.date)} · {followUp.state}
                    </p>
                    <small>
                      {followUp.note ?? "Nothing was sent from this demo."}
                    </small>
                  </div>
                </div>
              ))}
            </section>
          )}
        </aside>
      </div>
      {editingThing && (
        <ThingEditor
          thing={thing}
          onClose={() => setEditingThing(false)}
          onSaved={() => setMessage("Thing saved.")}
        />
      )}
    </div>
  );
}
