"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  Approval,
  AppState,
  InboxItem,
  Option,
  Role,
  Thing,
  ThingEditInput,
  ThingStatus,
} from "@/lib/domain";
import { canTransition, makeProposal, thingEditSchema } from "@/lib/domain";
import { initialState, seedThings } from "@/lib/seed";

export type MutationResult = { ok: boolean; message: string; id?: string };
type FollowUpInput = {
  thingId: string;
  waitingOn: string;
  date: string;
  channel?: string;
  note?: string;
  state: "drafted" | "attempted";
};
type MovementInput = {
  thingId: string;
  update: string;
  nextAction?: string;
  status?: ThingStatus;
};
type ApprovalInput = {
  thingId: string;
  title: string;
  recommendation: string;
  whyNow: string;
  context: string;
  actionLabel: string;
  meta: string;
  permission: "APPROVE" | "YOU";
};

type AppContextValue = AppState & {
  role: Role;
  ready: boolean;
  renderedAt: string;
  resolveApproval: (
    id: string,
    status: Approval["status"],
  ) => Promise<MutationResult>;
  updateApproval: (
    id: string,
    title: string,
    recommendation: string,
  ) => Promise<MutationResult>;
  capture: (
    raw: string,
    type: InboxItem["type"],
    fileName?: string,
  ) => Promise<MutationResult>;
  acceptProposal: (
    id: string,
    mode: "create" | "attach",
  ) => Promise<MutationResult>;
  dismissInbox: (id: string) => Promise<MutationResult>;
  createThing: (input: ThingEditInput) => Promise<MutationResult>;
  updateThing: (id: string, input: ThingEditInput) => Promise<MutationResult>;
  toggleThing: (
    id: string,
    key: "keepMoving" | "surpriseMe",
  ) => Promise<MutationResult>;
  setThingStatus: (id: string, status: ThingStatus) => Promise<MutationResult>;
  archiveThing: (id: string) => Promise<MutationResult>;
  addNote: (thingId: string, body: string) => Promise<MutationResult>;
  updateNote: (
    thingId: string,
    noteId: string,
    body: string,
  ) => Promise<MutationResult>;
  deleteNote: (thingId: string, noteId: string) => Promise<MutationResult>;
  updateSection: (
    thingId: string,
    sectionId: string,
    title: string,
    body: string,
  ) => Promise<MutationResult>;
  removeSection: (
    thingId: string,
    sectionId: string,
  ) => Promise<MutationResult>;
  addLink: (
    thingId: string,
    title: string,
    url: string,
  ) => Promise<MutationResult>;
  updateLink: (
    thingId: string,
    linkId: string,
    title: string,
    url: string,
  ) => Promise<MutationResult>;
  removeLink: (thingId: string, linkId: string) => Promise<MutationResult>;
  addOption: (
    thingId: string,
    input: Omit<Option, "id" | "status">,
  ) => Promise<MutationResult>;
  updateOption: (
    thingId: string,
    optionId: string,
    input: Omit<Option, "id">,
  ) => Promise<MutationResult>;
  removeOption: (thingId: string, optionId: string) => Promise<MutationResult>;
  recordMovement: (input: MovementInput) => Promise<MutationResult>;
  addFollowUp: (input: FollowUpInput) => Promise<MutationResult>;
  createApproval: (input: ApprovalInput) => Promise<MutationResult>;
  resetDemo: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);
const STORAGE_KEY = "hyphy-hq-demo-v2";
const LEGACY_STORAGE_KEY = "hyphy-hq-demo-v1";

function normalizeState(candidate: Partial<AppState>): AppState {
  const seeds = new Map(seedThings.map((thing) => [thing.id, thing]));
  const things = (candidate.things ?? initialState.things).map((thing) => {
    const seed = seeds.get(thing.id);
    return {
      ...seed,
      ...thing,
      ownerNextAction:
        thing.ownerNextAction ??
        seed?.ownerNextAction ??
        "Choose the next useful move.",
      assistantNextAction:
        thing.assistantNextAction ??
        seed?.assistantNextAction ??
        "Choose the next useful move.",
      followUps: thing.followUps ?? seed?.followUps ?? [],
      dates: thing.dates ?? [],
      contacts: thing.contacts ?? [],
      options: thing.options ?? [],
      notes: thing.notes ?? [],
      links: thing.links ?? [],
      sections: thing.sections ?? [],
    } as Thing;
  });
  return {
    schemaVersion: 2,
    things,
    approvals: candidate.approvals ?? initialState.approvals,
    inbox: candidate.inbox ?? initialState.inbox,
    activities: candidate.activities ?? initialState.activities,
  };
}

async function authorize(
  action: string,
  payload: unknown,
): Promise<
  | { ok: true; actor: "Jerry" | "Maria"; at: string }
  | { ok: false; message: string }
> {
  try {
    const response = await fetch("/api/demo/mutate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, payload }),
    });
    const result = (await response.json()) as {
      ok?: boolean;
      actor?: "Jerry" | "Maria";
      authorizedAt?: string;
      error?: string;
    };
    if (!response.ok || !result.ok || !result.actor || !result.authorizedAt)
      return {
        ok: false,
        message: result.error ?? "The change could not be saved.",
      };
    return { ok: true, actor: result.actor, at: result.authorizedAt };
  } catch {
    return {
      ok: false,
      message:
        "The change could not reach the workspace. Your input is still here—retry when connected.",
    };
  }
}

export function AppProvider({
  children,
  role,
  renderedAt,
}: {
  children: React.ReactNode;
  role: Role;
  renderedAt: string;
}) {
  const [state, setState] = useState<AppState>(initialState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let savedState: AppState | null = null;
    try {
      const saved =
        window.localStorage.getItem(STORAGE_KEY) ??
        window.localStorage.getItem(LEGACY_STORAGE_KEY);
      if (saved)
        savedState = normalizeState(JSON.parse(saved) as Partial<AppState>);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
    queueMicrotask(() => {
      if (savedState) setState(savedState);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (ready) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [ready, state]);

  const resolveApproval = useCallback(
    async (id: string, status: Approval["status"]): Promise<MutationResult> => {
      if (
        !(["approved", "rejected", "held"] as Approval["status"][]).includes(
          status,
        )
      )
        return { ok: false, message: "That decision state is not supported." };
      const auth = await authorize("resolve_approval", { id, status });
      if (!auth.ok) return auth;
      let title = "decision";
      setState((current) => {
        const approval = current.approvals.find((item) => item.id === id);
        if (!approval || approval.status !== "pending") return current;
        title = approval.title;
        const verb =
          status === "approved"
            ? "approved"
            : status === "held"
              ? "held"
              : "declined";
        return {
          ...current,
          approvals: current.approvals.map((item) =>
            item.id === id ? { ...item, status } : item,
          ),
          things: current.things.map((item) =>
            item.id === approval.thingId
              ? {
                  ...item,
                  status:
                    status === "approved" && item.status === "Needs You"
                      ? "Moving"
                      : item.status,
                  waitingOn: status === "approved" ? undefined : item.waitingOn,
                  ownerNextAction:
                    status === "approved"
                      ? "Decision resolved—Maria can take the next operational step."
                      : item.ownerNextAction,
                  lastMoved: auth.at,
                }
              : item,
          ),
          activities: [
            {
              id: crypto.randomUUID(),
              thingId: approval.thingId,
              actor: auth.actor,
              text: `${auth.actor} ${verb}: ${approval.title}.`,
              at: auth.at,
            },
            ...current.activities,
          ],
        };
      });
      return {
        ok: true,
        message:
          status === "approved"
            ? `${title} approved. Maria can keep this moving.`
            : status === "held"
              ? `${title} held for later.`
              : `${title} declined and recorded.`,
      };
    },
    [],
  );

  const updateApproval = useCallback(
    async (
      id: string,
      title: string,
      recommendation: string,
    ): Promise<MutationResult> => {
      const auth = await authorize("update_approval", {
        id,
        title,
        recommendation,
      });
      if (!auth.ok) return auth;
      setState((current) => ({
        ...current,
        approvals: current.approvals.map((item) =>
          item.id === id ? { ...item, title, recommendation } : item,
        ),
      }));
      return { ok: true, message: "Decision updated." };
    },
    [],
  );

  const capture = useCallback(
    async (
      raw: string,
      type: InboxItem["type"],
      fileName?: string,
    ): Promise<MutationResult> => {
      const auth = await authorize("capture_inbox", { raw, type, fileName });
      if (!auth.ok) return auth;
      const id = crypto.randomUUID();
      const item: InboxItem = {
        id,
        type,
        raw,
        fileName,
        status: "needs_review",
        createdAt: auth.at,
        proposal: makeProposal(raw),
      };
      setState((current) => ({ ...current, inbox: [item, ...current.inbox] }));
      return {
        ok: true,
        message: "Saved to Inbox. Your original capture is safe.",
        id,
      };
    },
    [],
  );

  const acceptProposal = useCallback(
    async (id: string, mode: "create" | "attach"): Promise<MutationResult> => {
      const auth = await authorize("accept_proposal", { id, mode });
      if (!auth.ok) return auth;
      setState((current) => {
        const item = current.inbox.find((candidate) => candidate.id === id);
        if (!item?.proposal) return current;
        const targetId =
          mode === "attach" ? item.proposal.relatedThingId : undefined;
        const at = auth.at;
        const actor = auth.actor;
        if (targetId)
          return {
            ...current,
            inbox: current.inbox.map((candidate) =>
              candidate.id === id
                ? { ...candidate, status: "attached" }
                : candidate,
            ),
            things: current.things.map((thing) =>
              thing.id === targetId
                ? {
                    ...thing,
                    lastMoved: at,
                    notes: [
                      {
                        id: crypto.randomUUID(),
                        author: actor,
                        body: item.proposal!.summary,
                        at,
                      },
                      ...thing.notes,
                    ],
                  }
                : thing,
            ),
            activities: [
              {
                id: crypto.randomUUID(),
                thingId: targetId,
                actor,
                text: `${actor} attached a reviewed Inbox capture.`,
                at,
              },
              ...current.activities,
            ],
          };
        const slug = `${item.proposal.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")}-${id.slice(0, 5)}`;
        const newThing: Thing = {
          id: slug,
          title: item.proposal.title,
          summary: item.proposal.summary,
          ownerNextAction: "Review the new Thing and choose its direction.",
          assistantNextAction: "Choose the first useful next move.",
          category: item.proposal.category,
          status: item.proposal.status,
          permission: item.proposal.permission,
          keepMoving: false,
          surpriseMe: false,
          archived: false,
          lastMoved: at,
          dates: [],
          contacts: [],
          options: [],
          notes: [],
          links: [],
          followUps: [],
          sections: [],
        };
        return {
          ...current,
          inbox: current.inbox.map((candidate) =>
            candidate.id === id
              ? { ...candidate, status: "accepted" }
              : candidate,
          ),
          things: [newThing, ...current.things],
          activities: [
            {
              id: crypto.randomUUID(),
              thingId: slug,
              actor,
              text: `${actor} turned an Inbox capture into a Thing.`,
              at,
            },
            ...current.activities,
          ],
        };
      });
      return {
        ok: true,
        message:
          mode === "attach"
            ? "Capture attached to the existing Thing."
            : "Capture turned into a Thing.",
      };
    },
    [],
  );

  const dismissInbox = useCallback(
    async (id: string): Promise<MutationResult> => {
      const auth = await authorize("dismiss_inbox", { id });
      if (!auth.ok) return auth;
      setState((current) => ({
        ...current,
        inbox: current.inbox.map((item) =>
          item.id === id ? { ...item, status: "failed" } : item,
        ),
      }));
      return {
        ok: true,
        message: "Proposal dismissed; the original capture remains in history.",
      };
    },
    [],
  );

  const createThing = useCallback(
    async (input: ThingEditInput): Promise<MutationResult> => {
      const parsed = thingEditSchema.safeParse(input);
      if (!parsed.success)
        return {
          ok: false,
          message:
            parsed.error.issues[0]?.message ?? "Check the Thing details.",
        };
      const auth = await authorize("create_thing", parsed.data);
      if (!auth.ok) return auth;
      const id = `${
        parsed.data.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "") || "thing"
      }-${crypto.randomUUID().slice(0, 5)}`;
      const { date, ...fields } = parsed.data;
      const thing: Thing = {
        id,
        ...fields,
        archived: false,
        lastMoved: auth.at,
        dates: date ? [date] : [],
        contacts: [],
        options: [],
        notes: [],
        links: [],
        followUps: [],
        sections: [],
      };
      setState((current) => ({
        ...current,
        things: [thing, ...current.things],
        activities: [
          {
            id: crypto.randomUUID(),
            thingId: id,
            actor: auth.actor,
            text: `${auth.actor} created ${thing.title}.`,
            at: auth.at,
          },
          ...current.activities,
        ],
      }));
      return { ok: true, message: "Thing created.", id };
    },
    [],
  );

  const updateThing = useCallback(
    async (id: string, input: ThingEditInput): Promise<MutationResult> => {
      const parsed = thingEditSchema.safeParse(input);
      if (!parsed.success)
        return {
          ok: false,
          message:
            parsed.error.issues[0]?.message ?? "Check the Thing details.",
        };
      const existing = state.things.find((thing) => thing.id === id);
      if (!existing)
        return { ok: false, message: "This Thing is no longer available." };
      const assistantChanges =
        role === "assistant"
          ? {
              summary: parsed.data.summary,
              ownerNextAction: parsed.data.ownerNextAction,
              assistantNextAction: parsed.data.assistantNextAction,
              status: parsed.data.status,
              location: parsed.data.location,
              keepMoving: parsed.data.keepMoving,
              surpriseMe: parsed.data.surpriseMe,
              date: parsed.data.date,
            }
          : parsed.data;
      const auth = await authorize("update_thing", {
        id,
        changes: assistantChanges,
      });
      if (!auth.ok) return auth;
      const { date, ...fields } = parsed.data;
      const changes =
        role === "assistant"
          ? {
              ...fields,
              title: existing.title,
              category: existing.category,
              permission: existing.permission,
            }
          : fields;
      const changedNextAction =
        existing.ownerNextAction !== changes.ownerNextAction ||
        existing.assistantNextAction !== changes.assistantNextAction;
      const changedStatus = existing.status !== changes.status;
      const text = changedNextAction
        ? `${auth.actor} changed the next action to “${role === "assistant" ? changes.assistantNextAction : changes.ownerNextAction}”.`
        : changedStatus
          ? `${auth.actor} moved this from ${existing.status} to ${changes.status}.`
          : `${auth.actor} updated the working brief.`;
      setState((current) => ({
        ...current,
        things: current.things.map((thing) =>
          thing.id === id
            ? {
                ...thing,
                ...changes,
                dates: date
                  ? [
                      { ...date, id: thing.dates[0]?.id },
                      ...thing.dates.slice(1),
                    ]
                  : thing.dates,
                lastMoved: auth.at,
              }
            : thing,
        ),
        activities: [
          {
            id: crypto.randomUUID(),
            thingId: id,
            actor: auth.actor,
            text,
            at: auth.at,
          },
          ...current.activities,
        ],
      }));
      return { ok: true, message: "Thing saved." };
    },
    [role, state.things],
  );

  const toggleThing = useCallback(
    async (
      id: string,
      key: "keepMoving" | "surpriseMe",
    ): Promise<MutationResult> => {
      const auth = await authorize("toggle_thing", { id, key });
      if (!auth.ok) return auth;
      setState((current) => ({
        ...current,
        things: current.things.map((thing) =>
          thing.id === id
            ? { ...thing, [key]: !thing[key], lastMoved: auth.at }
            : thing,
        ),
        activities: [
          {
            id: crypto.randomUUID(),
            thingId: id,
            actor: auth.actor,
            text: `${auth.actor} ${key === "keepMoving" ? "updated Keep This Moving" : "updated Surprise Me"}.`,
            at: auth.at,
          },
          ...current.activities,
        ],
      }));
      return { ok: true, message: "Preference saved." };
    },
    [],
  );

  const setThingStatus = useCallback(
    async (id: string, status: ThingStatus): Promise<MutationResult> => {
      const currentThing = state.things.find((item) => item.id === id);
      if (!currentThing || !canTransition(currentThing.status, status))
        return {
          ok: false,
          message: currentThing
            ? `${currentThing.status} can’t move directly to ${status}.`
            : "Thing not found.",
        };
      const auth = await authorize("change_status", { id, status });
      if (!auth.ok) return auth;
      setState((current) => ({
        ...current,
        things: current.things.map((item) =>
          item.id === id ? { ...item, status, lastMoved: auth.at } : item,
        ),
        activities: [
          {
            id: crypto.randomUUID(),
            thingId: id,
            actor: auth.actor,
            text: `${auth.actor} moved this Thing to ${status}.`,
            at: auth.at,
          },
          ...current.activities,
        ],
      }));
      return { ok: true, message: `Moved to ${status}.` };
    },
    [state.things],
  );

  const archiveThing = useCallback(
    async (id: string): Promise<MutationResult> => {
      const auth = await authorize("archive_thing", { id });
      if (!auth.ok) return auth;
      setState((current) => ({
        ...current,
        things: current.things.map((thing) =>
          thing.id === id
            ? { ...thing, archived: true, status: "Done", lastMoved: auth.at }
            : thing,
        ),
        activities: [
          {
            id: crypto.randomUUID(),
            thingId: id,
            actor: auth.actor,
            text: `${auth.actor} moved this Thing into the Archive.`,
            at: auth.at,
          },
          ...current.activities,
        ],
      }));
      return { ok: true, message: "Thing archived." };
    },
    [],
  );

  const addNote = useCallback(
    async (thingId: string, body: string): Promise<MutationResult> => {
      const auth = await authorize("add_note", { thingId, body });
      if (!auth.ok) return auth;
      setState((current) => ({
        ...current,
        things: current.things.map((thing) =>
          thing.id === thingId
            ? {
                ...thing,
                lastMoved: auth.at,
                notes: [
                  {
                    id: crypto.randomUUID(),
                    author: auth.actor,
                    body,
                    at: auth.at,
                  },
                  ...thing.notes,
                ],
              }
            : thing,
        ),
        activities: [
          {
            id: crypto.randomUUID(),
            thingId,
            actor: auth.actor,
            text: `${auth.actor} added a note.`,
            at: auth.at,
          },
          ...current.activities,
        ],
      }));
      return { ok: true, message: "Note added." };
    },
    [],
  );

  const updateNote = useCallback(
    async (
      thingId: string,
      noteId: string,
      body: string,
    ): Promise<MutationResult> => {
      const auth = await authorize("update_note", { thingId, noteId, body });
      if (!auth.ok) return auth;
      setState((current) => ({
        ...current,
        things: current.things.map((thing) =>
          thing.id === thingId
            ? {
                ...thing,
                notes: thing.notes.map((note) =>
                  note.id === noteId && note.author === auth.actor
                    ? { ...note, body, at: auth.at }
                    : note,
                ),
              }
            : thing,
        ),
        activities: [
          {
            id: crypto.randomUUID(),
            thingId,
            actor: auth.actor,
            text: `${auth.actor} refined a note.`,
            at: auth.at,
          },
          ...current.activities,
        ],
      }));
      return { ok: true, message: "Note updated." };
    },
    [],
  );

  const deleteNote = useCallback(
    async (thingId: string, noteId: string): Promise<MutationResult> => {
      const auth = await authorize("delete_note", { thingId, childId: noteId });
      if (!auth.ok) return auth;
      setState((current) => ({
        ...current,
        things: current.things.map((thing) =>
          thing.id === thingId
            ? {
                ...thing,
                notes: thing.notes.filter(
                  (note) => note.id !== noteId || note.author !== auth.actor,
                ),
              }
            : thing,
        ),
        activities: [
          {
            id: crypto.randomUUID(),
            thingId,
            actor: auth.actor,
            text: `${auth.actor} removed one of their notes.`,
            at: auth.at,
          },
          ...current.activities,
        ],
      }));
      return { ok: true, message: "Note removed." };
    },
    [],
  );

  const updateSection = useCallback(
    async (
      thingId: string,
      sectionId: string,
      title: string,
      body: string,
    ): Promise<MutationResult> => {
      const auth = await authorize("update_section", {
        thingId,
        sectionId,
        title,
        body,
      });
      if (!auth.ok) return auth;
      setState((current) => ({
        ...current,
        things: current.things.map((thing) =>
          thing.id === thingId
            ? {
                ...thing,
                sections: thing.sections.map((section) =>
                  section.id === sectionId
                    ? { ...section, title, body }
                    : section,
                ),
                lastMoved: auth.at,
              }
            : thing,
        ),
        activities: [
          {
            id: crypto.randomUUID(),
            thingId,
            actor: auth.actor,
            text: `${auth.actor} updated “${title}”.`,
            at: auth.at,
          },
          ...current.activities,
        ],
      }));
      return { ok: true, message: "Section saved." };
    },
    [],
  );

  const removeSection = useCallback(
    async (thingId: string, sectionId: string): Promise<MutationResult> => {
      const auth = await authorize("remove_section", {
        thingId,
        childId: sectionId,
      });
      if (!auth.ok) return auth;
      setState((current) => ({
        ...current,
        things: current.things.map((thing) =>
          thing.id === thingId
            ? {
                ...thing,
                sections: thing.sections.filter(
                  (section) => section.id !== sectionId,
                ),
              }
            : thing,
        ),
        activities: [
          {
            id: crypto.randomUUID(),
            thingId,
            actor: auth.actor,
            text: `${auth.actor} removed an unused context section.`,
            at: auth.at,
          },
          ...current.activities,
        ],
      }));
      return { ok: true, message: "Section removed." };
    },
    [],
  );

  const addLink = useCallback(
    async (
      thingId: string,
      title: string,
      url: string,
    ): Promise<MutationResult> => {
      const auth = await authorize("add_link", { thingId, title, url });
      if (!auth.ok) return auth;
      setState((current) => ({
        ...current,
        things: current.things.map((thing) =>
          thing.id === thingId
            ? {
                ...thing,
                links: [
                  { id: crypto.randomUUID(), title, url },
                  ...thing.links,
                ],
                lastMoved: auth.at,
              }
            : thing,
        ),
        activities: [
          {
            id: crypto.randomUUID(),
            thingId,
            actor: auth.actor,
            text: `${auth.actor} added a source link.`,
            at: auth.at,
          },
          ...current.activities,
        ],
      }));
      return { ok: true, message: "Link added." };
    },
    [],
  );

  const updateLink = useCallback(
    async (
      thingId: string,
      linkId: string,
      title: string,
      url: string,
    ): Promise<MutationResult> => {
      const auth = await authorize("update_link", {
        thingId,
        linkId,
        title,
        url,
      });
      if (!auth.ok) return auth;
      setState((current) => ({
        ...current,
        things: current.things.map((thing) =>
          thing.id === thingId
            ? {
                ...thing,
                links: thing.links.map((link) =>
                  link.id === linkId ? { ...link, title, url } : link,
                ),
                lastMoved: auth.at,
              }
            : thing,
        ),
        activities: [
          {
            id: crypto.randomUUID(),
            thingId,
            actor: auth.actor,
            text: `${auth.actor} updated a source link.`,
            at: auth.at,
          },
          ...current.activities,
        ],
      }));
      return { ok: true, message: "Link updated." };
    },
    [],
  );

  const removeLink = useCallback(
    async (thingId: string, linkId: string): Promise<MutationResult> => {
      const auth = await authorize("remove_link", { thingId, childId: linkId });
      if (!auth.ok) return auth;
      setState((current) => ({
        ...current,
        things: current.things.map((thing) =>
          thing.id === thingId
            ? {
                ...thing,
                links: thing.links.filter((link) => link.id !== linkId),
                lastMoved: auth.at,
              }
            : thing,
        ),
        activities: [
          {
            id: crypto.randomUUID(),
            thingId,
            actor: auth.actor,
            text: `${auth.actor} removed a source link.`,
            at: auth.at,
          },
          ...current.activities,
        ],
      }));
      return { ok: true, message: "Link removed." };
    },
    [],
  );

  const addOption = useCallback(
    async (
      thingId: string,
      input: Omit<Option, "id" | "status">,
    ): Promise<MutationResult> => {
      const auth = await authorize("add_option", { thingId, ...input });
      if (!auth.ok) return auth;
      const option: Option = {
        id: crypto.randomUUID(),
        ...input,
        status: "considering",
      };
      setState((current) => ({
        ...current,
        things: current.things.map((thing) =>
          thing.id === thingId
            ? {
                ...thing,
                options: [option, ...thing.options],
                lastMoved: auth.at,
              }
            : thing,
        ),
        activities: [
          {
            id: crypto.randomUUID(),
            thingId,
            actor: auth.actor,
            text: `${auth.actor} added ${option.name} as an option.`,
            at: auth.at,
          },
          ...current.activities,
        ],
      }));
      return { ok: true, message: "Option added." };
    },
    [],
  );

  const updateOption = useCallback(
    async (
      thingId: string,
      optionId: string,
      input: Omit<Option, "id">,
    ): Promise<MutationResult> => {
      const auth = await authorize("update_option", {
        thingId,
        optionId,
        ...input,
      });
      if (!auth.ok) return auth;
      setState((current) => ({
        ...current,
        things: current.things.map((thing) =>
          thing.id === thingId
            ? {
                ...thing,
                options: thing.options.map((option) =>
                  option.id === optionId ? { id: optionId, ...input } : option,
                ),
                lastMoved: auth.at,
              }
            : thing,
        ),
        activities: [
          {
            id: crypto.randomUUID(),
            thingId,
            actor: auth.actor,
            text: `${auth.actor} refined the ${input.name} option.`,
            at: auth.at,
          },
          ...current.activities,
        ],
      }));
      return { ok: true, message: "Option updated." };
    },
    [],
  );

  const removeOption = useCallback(
    async (thingId: string, optionId: string): Promise<MutationResult> => {
      const auth = await authorize("remove_option", {
        thingId,
        childId: optionId,
      });
      if (!auth.ok) return auth;
      setState((current) => ({
        ...current,
        things: current.things.map((thing) =>
          thing.id === thingId
            ? {
                ...thing,
                options: thing.options.filter(
                  (option) => option.id !== optionId,
                ),
                lastMoved: auth.at,
              }
            : thing,
        ),
        activities: [
          {
            id: crypto.randomUUID(),
            thingId,
            actor: auth.actor,
            text: `${auth.actor} removed an option.`,
            at: auth.at,
          },
          ...current.activities,
        ],
      }));
      return { ok: true, message: "Option removed." };
    },
    [],
  );

  const recordMovement = useCallback(
    async (input: MovementInput): Promise<MutationResult> => {
      const auth = await authorize("record_movement", input);
      if (!auth.ok) return auth;
      setState((current) => ({
        ...current,
        things: current.things.map((thing) =>
          thing.id === input.thingId
            ? {
                ...thing,
                assistantNextAction:
                  input.nextAction || thing.assistantNextAction,
                status:
                  input.status && canTransition(thing.status, input.status)
                    ? input.status
                    : thing.status,
                lastMoved: auth.at,
              }
            : thing,
        ),
        activities: [
          {
            id: crypto.randomUUID(),
            thingId: input.thingId,
            actor: auth.actor,
            text: input.update,
            at: auth.at,
          },
          ...current.activities,
        ],
      }));
      return {
        ok: true,
        message: "Movement recorded. Jerry can see it on Home.",
      };
    },
    [],
  );

  const addFollowUp = useCallback(
    async (input: FollowUpInput): Promise<MutationResult> => {
      const auth = await authorize("add_follow_up", input);
      if (!auth.ok) return auth;
      const followUp = {
        id: crypto.randomUUID(),
        waitingOn: input.waitingOn,
        date: input.date,
        channel: input.channel,
        note: input.note,
        state: input.state,
      };
      setState((current) => ({
        ...current,
        things: current.things.map((thing) =>
          thing.id === input.thingId
            ? {
                ...thing,
                waitingOn: input.waitingOn,
                status: thing.status === "Done" ? thing.status : "Waiting",
                assistantNextAction: `Follow up with ${input.waitingOn} on ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(input.date))}.`,
                followUps: [followUp, ...thing.followUps],
                dates: [
                  {
                    id: followUp.id,
                    label: `Follow up with ${input.waitingOn}`,
                    start: input.date,
                    precision: "exact",
                    readiness: `${input.state === "drafted" ? "Drafted" : "Attempted"} follow-up · no external completion claimed`,
                    unresolved: 1,
                  },
                  ...thing.dates,
                ],
                lastMoved: auth.at,
              }
            : thing,
        ),
        activities: [
          {
            id: crypto.randomUUID(),
            thingId: input.thingId,
            actor: auth.actor,
            text: `${auth.actor} prepared a ${input.state} follow-up with ${input.waitingOn}.`,
            at: auth.at,
          },
          ...current.activities,
        ],
      }));
      return { ok: true, message: "Follow-up prepared. Nothing was sent." };
    },
    [],
  );

  const createApproval = useCallback(
    async (input: ApprovalInput): Promise<MutationResult> => {
      const auth = await authorize("create_approval", input);
      if (!auth.ok) return auth;
      const approval: Approval = {
        id: crypto.randomUUID(),
        thingId: input.thingId,
        title: input.title,
        recommendation: input.recommendation,
        whyNow: input.whyNow,
        context: input.context,
        actionLabel: input.actionLabel,
        meta: input.meta,
        status: "pending",
      };
      setState((current) => ({
        ...current,
        approvals: [approval, ...current.approvals],
        things: current.things.map((thing) =>
          thing.id === input.thingId
            ? {
                ...thing,
                status: "Needs You",
                ownerNextAction: input.title,
                waitingOn: "Jerry",
                lastMoved: auth.at,
              }
            : thing,
        ),
        activities: [
          {
            id: crypto.randomUUID(),
            thingId: input.thingId,
            actor: auth.actor,
            text: `${auth.actor} prepared a decision for Jerry: ${input.title}.`,
            at: auth.at,
          },
          ...current.activities,
        ],
      }));
      return { ok: true, message: "Decision prepared for Jerry." };
    },
    [],
  );

  const resetDemo = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    setState(initialState);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      ...state,
      role,
      ready,
      renderedAt,
      resolveApproval,
      updateApproval,
      capture,
      acceptProposal,
      dismissInbox,
      createThing,
      updateThing,
      toggleThing,
      setThingStatus,
      archiveThing,
      addNote,
      updateNote,
      deleteNote,
      updateSection,
      removeSection,
      addLink,
      updateLink,
      removeLink,
      addOption,
      updateOption,
      removeOption,
      recordMovement,
      addFollowUp,
      createApproval,
      resetDemo,
    }),
    [
      state,
      role,
      ready,
      renderedAt,
      resolveApproval,
      updateApproval,
      capture,
      acceptProposal,
      dismissInbox,
      createThing,
      updateThing,
      toggleThing,
      setThingStatus,
      archiveThing,
      addNote,
      updateNote,
      deleteNote,
      updateSection,
      removeSection,
      addLink,
      updateLink,
      removeLink,
      addOption,
      updateOption,
      removeOption,
      recordMovement,
      addFollowUp,
      createApproval,
      resetDemo,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
}
