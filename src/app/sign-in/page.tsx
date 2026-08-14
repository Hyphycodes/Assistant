"use client";

import { useState } from "react";
import { ArrowRight, LockKeyhole, Sparkles } from "lucide-react";

export default function SignInPage() {
  const [loading, setLoading] = useState<"owner" | "assistant" | null>(null);
  const [error, setError] = useState("");

  async function signIn(role: "owner" | "assistant") {
    setLoading(role);
    setError("");
    try {
      const response = await fetch("/api/auth/demo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!response.ok) throw new Error("Sign-in failed");
      window.location.assign(role === "assistant" ? "/assistant" : "/");
    } catch {
      setError("The demo session could not be started. Please try again.");
      setLoading(null);
    }
  }

  return (
    <main className="signin-shell">
      <div className="signin-ambient" aria-hidden="true" />
      <section className="signin-story">
        <div className="brand-lockup"><span className="brand-glyph">H</span><span>Hyphy HQ</span></div>
        <div className="signin-copy">
          <p className="eyebrow">Private concierge workspace</p>
          <h1>Everything worth moving,<br /><em>kept in motion.</em></h1>
          <p>Drop the thought. Make the decision. Let the space between become progress.</p>
        </div>
        <div className="privacy-note"><LockKeyhole size={15} /> Private by design · Demo data is clearly labeled</div>
      </section>
      <section className="signin-card" aria-labelledby="signin-title">
        <div className="signin-card-mark"><Sparkles size={19} /></div>
        <p className="eyebrow">Welcome back</p>
        <h2 id="signin-title">Open the studio</h2>
        <p className="signin-intro">Choose a demo view. Production auth connects through the Supabase seam documented in the repository.</p>
        <div className="profile-choices">
          <button className="profile-choice" onClick={() => signIn("owner")} disabled={loading !== null}>
            <span className="avatar avatar-owner">J</span><span><strong>Continue as Jerry</strong><small>Owner · decisions and direction</small></span><ArrowRight size={18} />
          </button>
          <button className="profile-choice" onClick={() => signIn("assistant")} disabled={loading !== null}>
            <span className="avatar avatar-assistant">M</span><span><strong>Continue as Maria</strong><small>Assistant · momentum and follow-through</small></span><ArrowRight size={18} />
          </button>
        </div>
        {loading && <p className="form-status" aria-live="polite">Opening {loading === "owner" ? "Jerry’s" : "Maria’s"} view…</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <p className="signin-footnote">A fictional workspace for evaluation. No messages, bookings, or purchases are sent.</p>
      </section>
    </main>
  );
}
