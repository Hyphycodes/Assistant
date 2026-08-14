"use client";

import { Brain, CheckCircle2 } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { EmptyState, PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/format";

export default function PreferencesPage() { const { preferences } = useApp(); return <div className="page"><PageHeader eyebrow="Explicit, inspectable memory" title="Preferences" intro="Only confirmed signals become durable preferences. Every entry shows its source and confidence." /><div className="preference-list">{preferences.map((preference) => <article key={preference.id}><Brain size={18} /><div><div><span>{preference.domain}</span><strong>{preference.attribute}</strong>{preference.confirmed && <em><CheckCircle2 size={13} />Confirmed</em>}</div><h2>{preference.statement}</h2><p>{preference.sentiment} · {Math.round(preference.confidence * 100)}% confidence · source: {preference.sourceType}</p><small>Recorded {formatDate(preference.createdAt)}</small></div></article>)}</div>{!preferences.length && <EmptyState title="No confirmed preferences yet." body="Rejection reasons and explicit reactions can become inspectable memory here." />}</div>; }
