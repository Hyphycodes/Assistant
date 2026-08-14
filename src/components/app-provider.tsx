"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type {
  Approval, AppState, Contact, CustomFieldType, InboxItem, Option, Order, Role,
  ThingEditInput, ThingItem, ThingStatus, WorkspaceTemplate,
} from "@/lib/domain";
import { initialState } from "@/lib/seed";
import { normalizeWorkspaceState } from "@/lib/workspace-state";

export type MutationResult = { ok: boolean; message: string; id?: string };
export type PersistenceMode = "supabase" | "server-file" | "ephemeral-server";
export type WorkbenchAction = { thingId: string; update: string; nextAction?: string; status?: ThingStatus };
export type FollowUpInput = { thingId: string; waitingOn: string; date: string; channel?: string; note?: string; state: "drafted" | "attempted" };
export type ApprovalInput = { thingId: string; title: string; recommendation: string; whyNow: string; context: string; actionLabel: string; meta: string; permission: "APPROVE" | "YOU"; options?: { label: string; description?: string }[]; amount?: number; urgency?: "low" | "normal" | "high" };

type AppContextValue = AppState & {
  role: Role;
  ready: boolean;
  renderedAt: string;
  persistence: PersistenceMode;
  refreshWorkspace: () => Promise<void>;
  resolveApproval: (id: string, status: Approval["status"], reason?: string, note?: string) => Promise<MutationResult>;
  updateApproval: (id: string, title: string, recommendation: string) => Promise<MutationResult>;
  capture: (raw: string, type: InboxItem["type"], fileName?: string) => Promise<MutationResult>;
  acceptProposal: (id: string, mode: "create" | "attach", sectionId?: string, itemType?: ThingItem["type"], targetThingId?: string) => Promise<MutationResult>;
  dismissInbox: (id: string) => Promise<MutationResult>;
  reopenInbox: (id: string) => Promise<MutationResult>;
  createThing: (input: ThingEditInput, options?: { parentId?: string; templateId?: string }) => Promise<MutationResult>;
  updateThing: (id: string, input: ThingEditInput) => Promise<MutationResult>;
  toggleThing: (id: string, key: "keepMoving" | "surpriseMe") => Promise<MutationResult>;
  setThingStatus: (id: string, status: ThingStatus) => Promise<MutationResult>;
  archiveThing: (id: string) => Promise<MutationResult>;
  restoreThing: (id: string) => Promise<MutationResult>;
  duplicateThing: (thingId: string, title?: string, copyContacts?: boolean) => Promise<MutationResult>;
  moveSubthing: (thingId: string, parentId: string | null) => Promise<MutationResult>;
  relateThing: (thingId: string, relatedThingId: string) => Promise<MutationResult>;
  addNote: (thingId: string, body: string) => Promise<MutationResult>;
  updateNote: (thingId: string, noteId: string, body: string) => Promise<MutationResult>;
  deleteNote: (thingId: string, noteId: string) => Promise<MutationResult>;
  addSection: (thingId: string, title: string, body?: string) => Promise<MutationResult>;
  updateSection: (thingId: string, sectionId: string, title: string, body: string) => Promise<MutationResult>;
  moveSection: (thingId: string, sectionId: string, direction: "up" | "down") => Promise<MutationResult>;
  duplicateSection: (thingId: string, sectionId: string) => Promise<MutationResult>;
  removeSection: (thingId: string, sectionId: string) => Promise<MutationResult>;
  restoreSection: (thingId: string, sectionId: string) => Promise<MutationResult>;
  addItem: (thingId: string, input: { sectionId?: string; type: ThingItem["type"]; title: string; body?: string }) => Promise<MutationResult>;
  updateItem: (thingId: string, itemId: string, changes: Partial<Pick<ThingItem, "title" | "body" | "status" | "owner" | "dueAt">> & { sectionId?: string | null }) => Promise<MutationResult>;
  removeItem: (thingId: string, itemId: string) => Promise<MutationResult>;
  restoreItem: (thingId: string, itemId: string) => Promise<MutationResult>;
  addCustomField: (thingId: string, label: string, type: CustomFieldType, options?: string[]) => Promise<MutationResult>;
  updateCustomField: (thingId: string, fieldId: string, value: unknown, label?: string) => Promise<MutationResult>;
  removeCustomField: (thingId: string, fieldId: string) => Promise<MutationResult>;
  addLink: (thingId: string, title: string, url: string) => Promise<MutationResult>;
  updateLink: (thingId: string, linkId: string, title: string, url: string) => Promise<MutationResult>;
  removeLink: (thingId: string, linkId: string) => Promise<MutationResult>;
  addOption: (thingId: string, input: Omit<Option, "id" | "status">) => Promise<MutationResult>;
  updateOption: (thingId: string, optionId: string, input: Omit<Option, "id">) => Promise<MutationResult>;
  removeOption: (thingId: string, optionId: string) => Promise<MutationResult>;
  updateProductStatus: (thingId: string, optionId: string, status: Option["status"], reaction?: string) => Promise<MutationResult>;
  createOrder: (input: Omit<Order, "id">) => Promise<MutationResult>;
  updateOrder: (input: Order) => Promise<MutationResult>;
  recordMovement: (input: WorkbenchAction) => Promise<MutationResult>;
  addFollowUp: (input: FollowUpInput) => Promise<MutationResult>;
  markWaiting: (input: { thingId: string; waitingOn: string; waitingType: "owner" | "assistant" | "contact" | "date" | "delivery"; date: string; note?: string; contactId?: string }) => Promise<MutationResult>;
  markResponded: (thingId: string) => Promise<MutationResult>;
  createApproval: (input: ApprovalInput) => Promise<MutationResult>;
  createContact: (input: Omit<Contact, "id">) => Promise<MutationResult>;
  updateContact: (input: Contact) => Promise<MutationResult>;
  archiveContact: (id: string) => Promise<MutationResult>;
  attachContact: (thingId: string, contactId: string) => Promise<MutationResult>;
  createTemplate: (input: Omit<WorkspaceTemplate, "id">) => Promise<MutationResult>;
  resetDemo: () => Promise<MutationResult>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children, role, renderedAt }: { children: React.ReactNode; role: Role; renderedAt: string }) {
  const [state, setState] = useState<AppState>(() => normalizeWorkspaceState(initialState));
  const [ready, setReady] = useState(false);
  const [persistence, setPersistence] = useState<PersistenceMode>("server-file");

  const refreshWorkspace = useCallback(async () => {
    const response = await fetch("/api/workspace", { cache: "no-store" });
    const result = await response.json() as { ok?: boolean; state?: AppState; persistence?: PersistenceMode; error?: string };
    if (!response.ok || !result.ok || !result.state) throw new Error(result.error ?? "Workspace could not load.");
    setState(normalizeWorkspaceState(result.state));
    setPersistence(result.persistence ?? "server-file");
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      try { await refreshWorkspace(); }
      finally { if (active) setReady(true); }
    }
    void load();
    return () => { active = false; };
  }, [refreshWorkspace]);

  const command = useCallback(async (action: string, payload: unknown): Promise<MutationResult> => {
    try {
      const response = await fetch("/api/workspace", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, payload }) });
      const result = await response.json() as { ok?: boolean; state?: AppState; message?: string; id?: string; error?: string; persistence?: PersistenceMode };
      if (!response.ok || !result.ok || !result.state) return { ok: false, message: result.error ?? "The change could not be saved. Retry without losing your input." };
      setState(normalizeWorkspaceState(result.state));
      if (result.persistence) setPersistence(result.persistence);
      return { ok: true, message: result.message ?? "Saved.", id: result.id };
    } catch {
      return { ok: false, message: "The workspace could not be reached. Your input is still here—retry when connected." };
    }
  }, []);

  const resetDemo = useCallback(async (): Promise<MutationResult> => {
    try {
      const response = await fetch("/api/workspace", { method: "DELETE" });
      const result = await response.json() as { ok?: boolean; state?: AppState; message?: string; error?: string; persistence?: PersistenceMode };
      if (!response.ok || !result.state) return { ok: false, message: result.error ?? "Workspace reset failed." };
      setState(normalizeWorkspaceState(result.state));
      if (result.persistence) setPersistence(result.persistence);
      return { ok: true, message: result.message ?? "Workspace restored." };
    } catch { return { ok: false, message: "Workspace reset failed." }; }
  }, []);

  const actions = useMemo(() => ({
    resolveApproval: (id: string, status: Approval["status"], reason?: string, note?: string) => command("resolve_approval", { id, status, reason, note }),
    updateApproval: (id: string, title: string, recommendation: string) => command("update_approval", { id, title, recommendation }),
    capture: (raw: string, type: InboxItem["type"], fileName?: string) => command("capture_inbox", { text: raw, type, fileName }),
    acceptProposal: (id: string, mode: "create" | "attach", sectionId?: string, itemType?: ThingItem["type"], targetThingId?: string) => command("accept_proposal", { id, mode, sectionId, itemType, targetThingId }),
    dismissInbox: (id: string) => command("dismiss_inbox", { id }),
    reopenInbox: (id: string) => command("reopen_inbox", { id }),
    createThing: (input: ThingEditInput, options?: { parentId?: string; templateId?: string }) => command("create_thing", { ...input, ...options }),
    updateThing: (id: string, input: ThingEditInput) => command("update_thing", { id, changes: input }),
    toggleThing: (id: string, key: "keepMoving" | "surpriseMe") => command("toggle_thing", { id, key }),
    setThingStatus: (id: string, status: ThingStatus) => command("change_status", { id, status }),
    archiveThing: (id: string) => command("archive_thing", { id }), restoreThing: (id: string) => command("restore_thing", { id }),
    duplicateThing: (thingId: string, title?: string, copyContacts = false) => command("duplicate_thing", { thingId, title, copyContacts }),
    moveSubthing: (thingId: string, parentId: string | null) => command("move_subthing", { thingId, parentId }), relateThing: (thingId: string, relatedThingId: string) => command("relate_thing", { thingId, relatedThingId }),
    addNote: (thingId: string, body: string) => command("add_note", { thingId, body }), updateNote: (thingId: string, noteId: string, body: string) => command("update_note", { thingId, noteId, body }), deleteNote: (thingId: string, noteId: string) => command("delete_note", { thingId, childId: noteId }),
    addSection: (thingId: string, title: string, body = "") => command("add_section", { thingId, title, body }), updateSection: (thingId: string, sectionId: string, title: string, body: string) => command("update_section", { thingId, sectionId, title, body }), moveSection: (thingId: string, sectionId: string, direction: "up" | "down") => command("move_section", { thingId, sectionId, direction }), duplicateSection: (thingId: string, sectionId: string) => command("duplicate_section", { thingId, sectionId }), removeSection: (thingId: string, sectionId: string) => command("remove_section", { thingId, childId: sectionId }), restoreSection: (thingId: string, sectionId: string) => command("restore_section", { thingId, childId: sectionId }),
    addItem: (thingId: string, input: { sectionId?: string; type: ThingItem["type"]; title: string; body?: string }) => command("add_item", { thingId, ...input }), updateItem: (thingId: string, itemId: string, changes: Partial<Pick<ThingItem, "title" | "body" | "status" | "owner" | "dueAt">> & { sectionId?: string | null }) => command("update_item", { thingId, itemId, changes }), removeItem: (thingId: string, itemId: string) => command("remove_item", { thingId, childId: itemId }), restoreItem: (thingId: string, itemId: string) => command("restore_item", { thingId, childId: itemId }),
    addCustomField: (thingId: string, label: string, type: CustomFieldType, options?: string[]) => command("add_custom_field", { thingId, label, type, options }), updateCustomField: (thingId: string, fieldId: string, value: unknown, label?: string) => command("update_custom_field", { thingId, fieldId, value, label }), removeCustomField: (thingId: string, fieldId: string) => command("remove_custom_field", { thingId, childId: fieldId }),
    addLink: (thingId: string, title: string, url: string) => command("add_link", { thingId, title, url }), updateLink: (thingId: string, linkId: string, title: string, url: string) => command("update_link", { thingId, linkId, title, url }), removeLink: (thingId: string, linkId: string) => command("remove_link", { thingId, childId: linkId }),
    addOption: (thingId: string, input: Omit<Option, "id" | "status">) => command("add_option", { thingId, ...input }), updateOption: (thingId: string, optionId: string, input: Omit<Option, "id">) => command("update_option", { thingId, optionId, ...input }), removeOption: (thingId: string, optionId: string) => command("remove_option", { thingId, childId: optionId }), updateProductStatus: (thingId: string, optionId: string, status: Option["status"], reaction?: string) => command("update_product_status", { thingId, optionId, status, reaction }),
    createOrder: (input: Omit<Order, "id">) => command("create_order", input), updateOrder: (input: Order) => command("update_order", { ...input, orderId: input.id }),
    recordMovement: (input: WorkbenchAction) => command("record_movement", input), addFollowUp: (input: FollowUpInput) => command("add_follow_up", input), markWaiting: (input: { thingId: string; waitingOn: string; waitingType: "owner" | "assistant" | "contact" | "date" | "delivery"; date: string; note?: string; contactId?: string }) => command("mark_waiting", input), markResponded: (thingId: string) => command("mark_responded", { thingId }),
    createApproval: (input: ApprovalInput) => command("create_approval", input), createContact: (input: Omit<Contact, "id">) => command("create_contact", input), updateContact: (input: Contact) => command("update_contact", input), archiveContact: (id: string) => command("archive_contact", { id }), attachContact: (thingId: string, contactId: string) => command("attach_contact", { thingId, contactId }), createTemplate: (input: Omit<WorkspaceTemplate, "id">) => command("create_template", input),
  }), [command]);

  const value = useMemo<AppContextValue>(() => ({ ...state, role, ready, renderedAt, persistence, refreshWorkspace, resetDemo, ...actions }), [state, role, ready, renderedAt, persistence, refreshWorkspace, resetDemo, actions]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
}
