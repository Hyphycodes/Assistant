import type { AppState, Thing } from "./domain";
import { initialState, seedThings } from "./seed";

export function normalizeWorkspaceState(candidate?: Partial<AppState> | null): AppState {
  const seeds = new Map(seedThings.map((thing) => [thing.id, thing]));
  const things = (candidate?.things ?? initialState.things).map((thing) => {
    const seed = seeds.get(thing.id);
    return {
      ...seed,
      ...thing,
      ownerNextAction: thing.ownerNextAction ?? seed?.ownerNextAction ?? "Choose the next useful move.",
      assistantNextAction: thing.assistantNextAction ?? seed?.assistantNextAction ?? "Choose the next useful move.",
      owner: thing.owner ?? seed?.owner ?? "Jerry",
      priority: thing.priority ?? seed?.priority ?? "normal",
      tags: thing.tags ?? seed?.tags ?? [],
      collaborators: thing.collaborators ?? seed?.collaborators ?? ["Maria"],
      relatedThingIds: thing.relatedThingIds ?? seed?.relatedThingIds ?? [],
      followUps: thing.followUps ?? seed?.followUps ?? [],
      dates: thing.dates ?? [],
      contacts: thing.contacts ?? [],
      options: thing.options ?? [],
      notes: thing.notes ?? [],
      links: thing.links ?? [],
      sections: (thing.sections ?? []).map((section, position) => ({ ...section, position: section.position ?? position })),
      items: thing.items ?? [],
      customFields: thing.customFields ?? [],
    } as Thing;
  });

  return {
    schemaVersion: 3,
    revision: candidate?.revision ?? initialState.revision,
    things,
    approvals: candidate?.approvals ?? initialState.approvals,
    inbox: candidate?.inbox ?? initialState.inbox,
    activities: candidate?.activities ?? initialState.activities,
    contacts: candidate?.contacts ?? initialState.contacts,
    preferences: candidate?.preferences ?? initialState.preferences,
    templates: candidate?.templates ?? initialState.templates,
    orders: candidate?.orders ?? initialState.orders,
  };
}
