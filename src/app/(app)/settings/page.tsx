"use client";

import { Bell, Bot, CalendarDays, Check, Database, KeyRound, LockKeyhole, Mail, RotateCcw, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/app-provider";
import { PageHeader, Toggle } from "@/components/ui";

const integrations = [
  { name: "Calendar", detail: "Upcoming events and availability", icon: CalendarDays },
  { name: "Email", detail: "Drafts, follow-ups, and recaps", icon: Mail },
  { name: "AI & transcription", detail: "Extraction and voice processing", icon: Bot },
];

export default function SettingsPage() {
  const { role, resetDemo } = useApp();
  const [weekly, setWeekly] = useState(true);
  const [stale, setStale] = useState(true);
  const [notice, setNotice] = useState("");
  return (
    <div className="page settings-page">
      <PageHeader eyebrow="Private by default" title="Settings" intro="The workspace boundary, operating permission, and integration truth—all in one quiet place." />
      {notice && <div className="inline-notice" role="status"><Check size={15} />{notice}</div>}
      <div className="settings-layout">
        <section className="settings-card"><div className="settings-heading"><div className="settings-icon"><UserRound /></div><div><h2>Workspace & people</h2><p>One owner, one trusted operator.</p></div></div><div className="member-list"><div><span className="avatar avatar-owner">J</span><span><strong>Jerry</strong><small>Owner · active</small></span><span className="member-role">Owner</span></div><div><span className="avatar avatar-assistant">M</span><span><strong>Maria</strong><small>Assistant · active</small></span><span className="member-role">Assistant</span></div></div>{role !== "owner" && <p className="permission-note"><LockKeyhole size={14} />Only Jerry can change workspace membership or security.</p>}</section>
        <section className="settings-card"><div className="settings-heading"><div className="settings-icon"><KeyRound /></div><div><h2>Permission model</h2><p>Autonomy is explicit, scoped, and auditable.</p></div></div><div className="permission-legend"><div><strong>GO</strong><p>Research, organize, draft, and non-binding follow-up.</p></div><div><strong>APPROVE</strong><p>Maria prepares it; Jerry approves money or commitment.</p></div><div><strong>YOU</strong><p>Jerry personally handles sensitive judgment.</p></div></div><button className="button quiet" disabled={role !== "owner"}>Review autonomy preferences</button></section>
        <section className="settings-card full"><div className="settings-heading"><div className="settings-icon"><Database /></div><div><h2>Connections</h2><p>Nothing is implied to be live until it is verified.</p></div></div><div className="integration-list">{integrations.map(({ name, detail, icon: Icon }) => <div key={name}><span className="integration-icon"><Icon /></span><span><strong>{name}</strong><small>{detail}</small></span><span className="connection-state">Disconnected</span><button className="button quiet" disabled={role !== "owner"}>Connect</button></div>)}</div></section>
        <section className="settings-card"><div className="settings-heading"><div className="settings-icon"><Bell /></div><div><h2>Recaps & nudges</h2><p>Useful signal without another noisy feed.</p></div></div><Toggle checked={weekly} onChange={() => setWeekly(!weekly)} label="Weekly studio note" description="Movement, decisions, waiting, and what’s coming." /><Toggle checked={stale} onChange={() => setStale(!stale)} label="Keep-moving check" description="Suggest one useful step when an active Thing goes quiet." /></section>
        <section className="settings-card"><div className="settings-heading"><div className="settings-icon"><ShieldCheck /></div><div><h2>Privacy & data</h2><p>Private workspace records with an export path.</p></div></div><ul className="security-list"><li><Check />Private media access</li><li><Check />Append-oriented activity history</li><li><Check />Workspace-scoped search</li><li><Check />Provider secrets stay out of app records</li></ul><div className="settings-actions"><button className="button quiet" disabled={role !== "owner"}>Export workspace</button><button className="button quiet" disabled={role !== "owner"}>Delete workspace</button></div></section>
      </div>
      <section className="demo-panel"><div><span className="demo-icon"><Sparkles /></span><div><p className="eyebrow">Local demo tools</p><h2>Reset the studio</h2><p>Restore the fictional seed workspace and clear any local changes from this browser.</p></div></div><button className="button quiet" onClick={() => { resetDemo(); setNotice("Demo workspace restored."); }}><RotateCcw size={15} />Reset demo data</button></section>
    </div>
  );
}
