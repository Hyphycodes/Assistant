import "server-only";

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AppState } from "@/lib/domain";
import { initialState } from "@/lib/seed";
import { normalizeWorkspaceState } from "@/lib/workspace-state";

const WORKSPACE_ID = process.env.HYPHY_WORKSPACE_ID ?? "demo-workspace";
const localDirectory = process.env.VERCEL ? path.join("/tmp", "hyphy-hq") : path.join(process.cwd(), ".data");
const localPath = path.join(localDirectory, `${WORKSPACE_ID}.json`);

export type PersistenceMode = "supabase" | "server-file" | "ephemeral-server";

function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const workspaceIdIsUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(WORKSPACE_ID);
  return url && key && workspaceIdIsUuid ? { url, key } : null;
}

export function persistenceMode(): PersistenceMode {
  return supabaseConfig() ? "supabase" : process.env.VERCEL ? "ephemeral-server" : "server-file";
}

async function supabaseRequest(pathname: string, init?: RequestInit) {
  const config = supabaseConfig();
  if (!config) throw new Error("SUPABASE_NOT_CONFIGURED");
  return fetch(`${config.url}/rest/v1/${pathname}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: config.key,
      authorization: `Bearer ${config.key}`,
      "content-type": "application/json",
      ...init?.headers,
    },
  });
}

export async function loadWorkspaceState(): Promise<AppState> {
  if (supabaseConfig()) {
    const response = await supabaseRequest(`workspace_snapshots?workspace_id=eq.${WORKSPACE_ID}&select=state,revision&limit=1`);
    if (!response.ok) throw new Error(`PERSISTENCE_READ_FAILED:${response.status}`);
    const rows = await response.json() as Array<{ state: Partial<AppState>; revision: number }>;
    if (!rows[0]) {
      const seeded = normalizeWorkspaceState(initialState);
      await saveWorkspaceState(seeded, 0);
      return seeded;
    }
    return normalizeWorkspaceState({ ...rows[0].state, revision: rows[0].revision });
  }

  try {
    return normalizeWorkspaceState(JSON.parse(await readFile(localPath, "utf8")) as Partial<AppState>);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    await mkdir(localDirectory, { recursive: true });
    const seeded = normalizeWorkspaceState(initialState);
    await writeFile(localPath, JSON.stringify(seeded, null, 2), "utf8");
    return seeded;
  }
}

export async function saveWorkspaceState(state: AppState, previousRevision: number): Promise<AppState> {
  const next = normalizeWorkspaceState({ ...state, revision: previousRevision + 1 });
  if (supabaseConfig()) {
    if (previousRevision === 0) {
      const response = await supabaseRequest("workspace_snapshots?on_conflict=workspace_id", {
        method: "POST",
        headers: { prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify({ workspace_id: WORKSPACE_ID, revision: next.revision, state: next }),
      });
      if (!response.ok) throw new Error(`PERSISTENCE_WRITE_FAILED:${response.status}`);
      return next;
    }
    const response = await supabaseRequest(`workspace_snapshots?workspace_id=eq.${WORKSPACE_ID}&revision=eq.${previousRevision}`, {
      method: "PATCH",
      headers: { prefer: "return=representation" },
      body: JSON.stringify({ revision: next.revision, state: next, updated_at: new Date().toISOString() }),
    });
    if (!response.ok) throw new Error(`PERSISTENCE_WRITE_FAILED:${response.status}`);
    const rows = await response.json() as unknown[];
    if (!rows.length) throw new Error("PERSISTENCE_CONFLICT");
    return next;
  }

  await mkdir(localDirectory, { recursive: true });
  const temporary = `${localPath}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(next, null, 2), "utf8");
  await rename(temporary, localPath);
  return next;
}

export async function resetWorkspaceState() {
  const current = await loadWorkspaceState();
  return saveWorkspaceState(normalizeWorkspaceState(initialState), current.revision);
}
