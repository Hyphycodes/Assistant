"use client";

import { CircleAlert, RotateCcw } from "lucide-react";

export default function ErrorPage({ unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return <div className="page"><div className="error-state"><CircleAlert /><p className="eyebrow">The studio hit a snag</p><h1>This page couldn’t settle in.</h1><p>Your saved captures and Things are untouched. Try the page again.</p><button className="button primary" onClick={unstable_retry}><RotateCcw size={15} />Try again</button></div></div>;
}
