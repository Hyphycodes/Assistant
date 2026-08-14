export type ExternalActionState = "drafted" | "awaiting_approval" | "approved" | "queued" | "attempted" | "confirmed" | "failed" | "needs_review";

export type ProviderStatus = { connected: boolean; label: "connected" | "disconnected" | "error"; lastSyncedAt?: string };

export interface IntegrationProvider<TInput, TOutput> {
  readonly name: string;
  status(): Promise<ProviderStatus>;
  execute(input: TInput, idempotencyKey: string): Promise<{ state: ExternalActionState; output?: TOutput; error?: string }>;
}

export class DisconnectedProvider implements IntegrationProvider<unknown, never> {
  constructor(readonly name: string) {}
  async status(): Promise<ProviderStatus> { return { connected: false, label: "disconnected" }; }
  async execute() { return { state: "failed" as const, error: `${this.name} is not connected. Nothing was sent or completed.` }; }
}
