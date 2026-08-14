"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Approval, AppState, InboxItem, Role, ThingStatus } from "@/lib/domain";
import { canTransition, makeProposal } from "@/lib/domain";
import { initialState } from "@/lib/seed";

type AppContextValue = AppState & {
  role: Role;
  ready: boolean;
  resolveApproval: (id: string, status: Approval["status"]) => boolean;
  capture: (raw: string, type: InboxItem["type"], fileName?: string) => string;
  acceptProposal: (id: string, mode: "create" | "attach") => void;
  dismissInbox: (id: string) => void;
  toggleThing: (id: string, key: "keepMoving" | "surpriseMe") => void;
  setThingStatus: (id: string, status: ThingStatus) => boolean;
  archiveThing: (id: string) => void;
  addNote: (thingId: string, body: string) => void;
  resetDemo: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);
const STORAGE_KEY = "hyphy-hq-demo-v1";

export function AppProvider({ children, role }: { children: React.ReactNode; role: Role }) {
  const [state, setState] = useState<AppState>(initialState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let savedState: AppState | null = null;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) savedState = JSON.parse(saved) as AppState;
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    queueMicrotask(() => {
      if (savedState) setState(savedState);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (ready) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [ready, state]);

  const resolveApproval = useCallback((id: string, status: Approval["status"]) => {
    if (role !== "owner") return false;
    setState((current) => {
      const approval = current.approvals.find((item) => item.id === id);
      if (!approval || approval.status !== "pending") return current;
      const verb = status === "approved" ? "approved" : status === "held" ? "held" : "declined";
      return {
        ...current,
        approvals: current.approvals.map((item) => (item.id === id ? { ...item, status } : item)),
        things: current.things.map((item) =>
          item.id === approval.thingId && status === "approved" && item.status === "Needs You"
            ? { ...item, status: "Moving", waitingOn: undefined, lastMoved: new Date().toISOString() }
            : item,
        ),
        activities: [
          { id: crypto.randomUUID(), thingId: approval.thingId, actor: "Jerry", text: `Jerry ${verb}: ${approval.title}.`, at: new Date().toISOString() },
          ...current.activities,
        ],
      };
    });
    return true;
  }, [role]);

  const capture = useCallback((raw: string, type: InboxItem["type"], fileName?: string) => {
    const id = crypto.randomUUID();
    const item: InboxItem = {
      id,
      type,
      raw,
      fileName,
      status: "needs_review",
      createdAt: new Date().toISOString(),
      proposal: makeProposal(raw),
    };
    setState((current) => ({ ...current, inbox: [item, ...current.inbox] }));
    return id;
  }, []);

  const acceptProposal = useCallback((id: string, mode: "create" | "attach") => {
    setState((current) => {
      const item = current.inbox.find((candidate) => candidate.id === id);
      if (!item?.proposal) return current;
      const targetId = mode === "attach" ? item.proposal.relatedThingId : undefined;

      if (targetId) {
        return {
          ...current,
          inbox: current.inbox.map((candidate) => candidate.id === id ? { ...candidate, status: "attached" } : candidate),
          things: current.things.map((thing) => thing.id === targetId ? {
            ...thing,
            lastMoved: new Date().toISOString(),
            notes: [{ id: crypto.randomUUID(), author: role === "owner" ? "Jerry" : "Maria", body: item.proposal!.summary, at: new Date().toISOString() }, ...thing.notes],
          } : thing),
          activities: [{ id: crypto.randomUUID(), thingId: targetId, actor: role === "owner" ? "Jerry" : "Maria", text: `${role === "owner" ? "Jerry" : "Maria"} attached a reviewed Inbox capture.`, at: new Date().toISOString() }, ...current.activities],
        };
      }

      const slug = `${item.proposal.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${id.slice(0, 5)}`;
      return {
        ...current,
        inbox: current.inbox.map((candidate) => candidate.id === id ? { ...candidate, status: "accepted" } : candidate),
        things: [{
          id: slug,
          title: item.proposal.title,
          summary: item.proposal.summary,
          category: item.proposal.category,
          status: item.proposal.status,
          permission: item.proposal.permission,
          keepMoving: false,
          surpriseMe: false,
          archived: false,
          lastMoved: new Date().toISOString(),
          dates: [], contacts: [], options: [], notes: [], links: [], sections: [],
        }, ...current.things],
        activities: [{ id: crypto.randomUUID(), thingId: slug, actor: role === "owner" ? "Jerry" : "Maria", text: `${role === "owner" ? "Jerry" : "Maria"} turned an Inbox capture into a Thing.`, at: new Date().toISOString() }, ...current.activities],
      };
    });
  }, [role]);

  const dismissInbox = useCallback((id: string) => {
    setState((current) => ({ ...current, inbox: current.inbox.map((item) => item.id === id ? { ...item, status: "failed" } : item) }));
  }, []);

  const toggleThing = useCallback((id: string, key: "keepMoving" | "surpriseMe") => {
    setState((current) => ({
      ...current,
      things: current.things.map((thing) => thing.id === id ? { ...thing, [key]: !thing[key], lastMoved: new Date().toISOString() } : thing),
    }));
  }, []);

  const setThingStatus = useCallback((id: string, status: ThingStatus) => {
    let valid = false;
    setState((current) => {
      const thing = current.things.find((item) => item.id === id);
      if (!thing || !canTransition(thing.status, status)) return current;
      valid = true;
      return {
        ...current,
        things: current.things.map((item) => item.id === id ? { ...item, status, lastMoved: new Date().toISOString() } : item),
        activities: [{ id: crypto.randomUUID(), thingId: id, actor: role === "owner" ? "Jerry" : "Maria", text: `${role === "owner" ? "Jerry" : "Maria"} moved this Thing to ${status}.`, at: new Date().toISOString() }, ...current.activities],
      };
    });
    return valid;
  }, [role]);

  const archiveThing = useCallback((id: string) => {
    setState((current) => ({
      ...current,
      things: current.things.map((thing) => thing.id === id ? { ...thing, archived: true, status: "Done" } : thing),
      activities: [{ id: crypto.randomUUID(), thingId: id, actor: role === "owner" ? "Jerry" : "Maria", text: `${role === "owner" ? "Jerry" : "Maria"} moved this Thing into the Archive.`, at: new Date().toISOString() }, ...current.activities],
    }));
  }, [role]);

  const addNote = useCallback((thingId: string, body: string) => {
    const actor = role === "owner" ? "Jerry" : "Maria";
    setState((current) => ({
      ...current,
      things: current.things.map((thing) => thing.id === thingId ? { ...thing, lastMoved: new Date().toISOString(), notes: [{ id: crypto.randomUUID(), author: actor, body, at: new Date().toISOString() }, ...thing.notes] } : thing),
      activities: [{ id: crypto.randomUUID(), thingId, actor, text: `${actor} added a note.`, at: new Date().toISOString() }, ...current.activities],
    }));
  }, [role]);

  const resetDemo = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setState(initialState);
  }, []);

  const value = useMemo<AppContextValue>(() => ({
    ...state, role, ready, resolveApproval, capture, acceptProposal, dismissInbox, toggleThing, setThingStatus, archiveThing, addNote, resetDemo,
  }), [state, role, ready, resolveApproval, capture, acceptProposal, dismissInbox, toggleThing, setThingStatus, archiveThing, addNote, resetDemo]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
}
