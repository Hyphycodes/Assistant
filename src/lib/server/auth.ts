import { cookies } from "next/headers";
import type { Role } from "@/lib/domain";

export type WorkspaceSession = {
  userId: string;
  workspaceId: string;
  role: Role;
  mode: "demo" | "supabase";
};

/**
 * Central server authorization seam. Demo cookies never authorize a production
 * data provider; once Supabase is configured, replace only this adapter and keep
 * workspace authorization at every mutation boundary.
 */
export async function requireWorkspaceSession(): Promise<WorkspaceSession> {
  const value = (await cookies()).get("hyphy_session")?.value;
  if (value === "demo:owner") return { userId: "demo-jerry", workspaceId: "demo-workspace", role: "owner", mode: "demo" };
  if (value === "demo:assistant") return { userId: "demo-maria", workspaceId: "demo-workspace", role: "assistant", mode: "demo" };
  throw new Error("UNAUTHENTICATED");
}

export async function requireOwner() {
  const session = await requireWorkspaceSession();
  if (session.role !== "owner") throw new Error("OWNER_REQUIRED");
  return session;
}
