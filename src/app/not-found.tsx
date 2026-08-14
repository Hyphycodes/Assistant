import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return <main className="standalone-state"><p className="eyebrow">404 · No open loop here</p><h1>That page slipped out of view.</h1><p>The useful context is probably still in Things or Archive.</p><Link href="/" className="button primary"><ArrowLeft size={15} />Back home</Link></main>;
}
