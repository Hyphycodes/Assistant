import { cookies } from "next/headers";
import { AppShell } from "@/components/app-shell";
import type { Role } from "@/lib/domain";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const session = (await cookies()).get("hyphy_session")?.value;
  const role: Role = session === "demo:assistant" ? "assistant" : "owner";
  return <AppShell role={role}>{children}</AppShell>;
}
