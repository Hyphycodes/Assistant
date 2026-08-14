import type { InboxItem } from "@/lib/domain";
import { makeProposal } from "@/lib/domain";

export type ExtractionResult = NonNullable<InboxItem["proposal"]> & {
  provider: string;
  source: "deterministic" | "ai";
};

export interface CaptureExtractionProvider {
  readonly name: string;
  extract(raw: string): Promise<ExtractionResult>;
}

export class DeterministicExtractionProvider implements CaptureExtractionProvider {
  readonly name = "deterministic-local";
  async extract(raw: string): Promise<ExtractionResult> {
    const proposal = makeProposal(raw);
    if (!proposal) throw new Error("PROPOSAL_FAILED");
    return { ...proposal, provider: this.name, source: "deterministic" };
  }
}

export function getExtractionProvider(): CaptureExtractionProvider {
  // Production AI adapters can be selected here after validating credentials.
  // The fallback stays useful and never invents external facts or completion.
  return new DeterministicExtractionProvider();
}
