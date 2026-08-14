import { NextResponse } from "next/server";
import { requireWorkspaceSession } from "@/lib/server/auth";
import { loadWorkspaceState, persistenceMode, resetWorkspaceState, saveWorkspaceState } from "@/lib/server/workspace-store";
import { applyWorkspaceCommand } from "@/lib/server/workspace-commands";

let commandQueue: Promise<void> = Promise.resolve();

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Workspace request failed.";
  const status = message === "UNAUTHENTICATED" ? 401 : /Only Jerry|Only the owner|controls/.test(message) ? 403 : /not found|no longer|cycle|edge|cannot|can’t|Choose/.test(message) ? 409 : 400;
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET() {
  try {
    await requireWorkspaceSession();
    const state = await loadWorkspaceState();
    return NextResponse.json({ ok: true, state, persistence: persistenceMode() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireWorkspaceSession();
    const body = await request.json() as { action?: string; payload?: unknown };
    if (!body.action) return NextResponse.json({ ok: false, error: "Workspace action is required." }, { status: 400 });

    let response: { state: Awaited<ReturnType<typeof loadWorkspaceState>>; message: string; id?: string } | undefined;
    let failure: unknown;
    commandQueue = commandQueue.then(async () => {
      try {
        const current = await loadWorkspaceState();
        const result = applyWorkspaceCommand(current, session.role, body.action!, body.payload, new Date().toISOString());
        const state = await saveWorkspaceState(result.state, current.revision);
        response = { state, message: result.message, id: result.id };
      } catch (error) {
        failure = error;
      }
    });
    await commandQueue;
    if (failure) throw failure;
    return NextResponse.json({ ok: true, ...response, persistence: persistenceMode() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE() {
  try {
    const session = await requireWorkspaceSession();
    if (session.role !== "owner" && process.env.NODE_ENV === "production") throw new Error("Only Jerry can reset the workspace.");
    const state = await resetWorkspaceState();
    return NextResponse.json({ ok: true, state, message: "Development workspace restored.", persistence: persistenceMode() });
  } catch (error) {
    return errorResponse(error);
  }
}
