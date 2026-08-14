"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";

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
      <section className="signin-card" aria-labelledby="signin-title">
        <div className="brand-lockup"><span className="brand-glyph">H</span><span>Hyphy HQ</span></div>
        <h1 id="signin-title">Who’s signing in?</h1>
        <div className="profile-choices">
          <button className="profile-choice" onClick={() => signIn("owner")} disabled={loading !== null}>
            <span className="avatar avatar-owner">J</span><span><strong>Jerry</strong><small>Owner</small></span><ArrowRight size={18} />
          </button>
          <button className="profile-choice" onClick={() => signIn("assistant")} disabled={loading !== null}>
            <span className="avatar avatar-assistant">M</span><span><strong>Maria</strong><small>Assistant</small></span><ArrowRight size={18} />
          </button>
        </div>
        {loading && <p className="form-status" aria-live="polite">Opening {loading === "owner" ? "Jerry’s" : "Maria’s"} view…</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <p className="signin-footnote">Demo workspace — nothing is sent, booked, or purchased.</p>
      </section>
    </main>
  );
}
