import type { AppState, Thing } from "./domain";
import { initialState, seedThings } from "./seed";

function mergeById<T extends { id: string }>(current: T[] = [], defaults: T[] = []) {
  const currentById = new Map(current.map((entry) => [entry.id, entry]));
  return [
    ...defaults.map((entry) => ({ ...entry, ...currentById.get(entry.id) })),
    ...current.filter((entry) => !defaults.some((fallback) => fallback.id === entry.id)),
  ];
}

export function normalizeWorkspaceState(candidate?: Partial<AppState> | null): AppState {
  const seeds = new Map(seedThings.map((thing) => [thing.id, thing]));
  const currentThings = candidate?.things ?? initialState.things;
  const things = currentThings.map((thing) => {
    const seed = seeds.get(thing.id);
    const currentSections = thing.id === "camping-red-oak" ? (thing.sections ?? []).filter((section) => !["camp-hiking", "camp-packing"].includes(section.id)) : thing.sections ?? [];
    const sections = mergeById(currentSections, seed?.sections ?? []).map((section, position) => {
      const canonical = thing.id === "camping-red-oak" ? seed?.sections.find((entry) => entry.id === section.id) : undefined;
      return { ...section, ...(canonical ? { title: canonical.title, body: canonical.body, position: canonical.position } : { position: section.position ?? position }) };
    });
    const currentItems = thing.id === "camping-red-oak" ? (thing.items ?? []).filter((entry) => !/^camp-item-\d+$/.test(entry.id)) : thing.items ?? [];
    const items = mergeById(currentItems, seed?.items ?? []).map((entry) => ({ ...entry, links: entry.links ?? [], notes: entry.notes ?? [] }));
    const options = mergeById(thing.options ?? [], seed?.options ?? []);
    const links = mergeById(thing.links ?? [], seed?.links ?? []);
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
      options,
      notes: thing.notes ?? [],
      links,
      sections,
      items,
      customFields: thing.customFields ?? [],
    } as Thing;
  }).concat(seedThings.filter((seed) => !currentThings.some((thing) => thing.id === seed.id)));

  const currentApprovals = candidate?.approvals ?? initialState.approvals;
  const approvals = mergeById(currentApprovals, initialState.approvals).map((approval) => {
    const seed = initialState.approvals.find((entry) => entry.id === approval.id);
    if (!seed) return approval;
    return { ...approval, title: seed.title, context: seed.context, recommendation: seed.recommendation, whyNow: seed.whyNow, actionLabel: seed.actionLabel, meta: seed.meta, options: seed.options, amount: seed.amount, currency: seed.currency, urgency: seed.urgency };
  });

  return {
    schemaVersion: 3,
    revision: candidate?.revision ?? initialState.revision,
    things,
    approvals,
    inbox: candidate?.inbox ?? initialState.inbox,
    activities: mergeById(candidate?.activities ?? [], initialState.activities).sort((a, b) => b.at.localeCompare(a.at)),
    contacts: candidate?.contacts ?? initialState.contacts,
    preferences: candidate?.preferences ?? initialState.preferences,
    templates: candidate?.templates ?? initialState.templates,
    orders: candidate?.orders ?? initialState.orders,
  };
}
