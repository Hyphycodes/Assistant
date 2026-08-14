import type { Activity, Thing, ThingItem } from "./domain";

export function visiblePlanItems(thing: Thing) {
  return thing.items.filter((item) => !item.archived);
}

export function isComplete(item: ThingItem) {
  return item.status === "complete" || item.status === "done";
}

export function progressSummary(thing: Thing) {
  const items = visiblePlanItems(thing);
  const places = items.filter((item) => item.type === "place" || item.type === "person");
  if (/tailor/i.test(thing.title) && places.length) return `${places.length} places found`;
  if (items.length) {
    const complete = items.filter(isComplete).length;
    return complete ? `${complete} of ${items.length} ready` : `${items.length} plan ${items.length === 1 ? "item" : "items"}`;
  }
  if (thing.sections.filter((section) => !section.archived).length) {
    return `${thing.sections.filter((section) => !section.archived).length} plan sections`;
  }
  return "Ready to shape";
}

export function latestThingActivity(activities: Activity[], thingId: string) {
  return activities
    .filter((activity) => activity.thingId === thingId)
    .sort((a, b) => b.at.localeCompare(a.at))[0];
}

export function relativeTime(at: string, renderedAt: string) {
  const difference = Math.max(0, new Date(renderedAt).getTime() - new Date(at).getTime());
  const hours = Math.floor(difference / 3_600_000);
  if (hours < 1) return "now";
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days}d`;
}

export function conciseActivity(activity?: Activity) {
  if (!activity) return undefined;
  return activity.text.replace(/^Maria\s+/i, "").replace(/\.$/, "");
}
