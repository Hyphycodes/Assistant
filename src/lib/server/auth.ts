import { cookies } from "next/headers";
import type { Role } from "@/lib/domain";

export type WorkspaceSession = {
  userId: string;
  workspaceId: string;
  role: Role;
  mode: "demo" | "supabase";
};

/**
 * Central authorization seam. The included cookie profiles are evaluation-only.
 * Replace this adapter with verified Supabase Auth claims before accepting private
 * production data, while keeping authorization at every command boundary.
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
