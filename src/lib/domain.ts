import { z } from "zod";

export const categoryValues = [
  "Personal",
  "Shopping",
  "Trips & Experiences",
  "Business",
  "Creative",
  "Future",
] as const;

export const statusValues = [
  "Inbox",
  "Exploring",
  "Moving",
  "Waiting",
  "Needs You",
  "Ready",
  "Done",
  "Someday",
] as const;

export const permissionValues = ["GO", "APPROVE", "YOU"] as const;

/**
 * The stored pipeline keeps eight states so existing data and the Supabase
 * schema stay valid, but the UI only ever shows three: Open, Needs You, Done.
 * "Someday" is treated as a lightweight "later" flag rather than a state.
 */
export const displayStatusValues = ["Open", "Needs You", "Done"] as const;

export type Category = (typeof categoryValues)[number];
export type ThingStatus = (typeof statusValues)[number];
export type Permission = (typeof permissionValues)[number];
export type DisplayStatus = (typeof displayStatusValues)[number];
export type Role = "owner" | "assistant";

export const customFieldTypeValues = [
  "short_text", "long_text", "number", "currency", "date", "date_range",
  "checkbox", "contact", "select", "multi_select", "url", "status",
] as const;
export type CustomFieldType = (typeof customFieldTypeValues)[number];

export type ThingDate = {
  id?: string;
  label: string;
  start: string;
  end?: string;
  precision: "exact" | "range" | "month" | "unknown";
  readiness: string;
  unresolved: number;
};

export type Option = {
  id: string;
  name: string;
  description: string;
  price?: string;
  source?: string;
  recommendation?: string;
  tradeoff?: string;
  status: "recommended" | "considering" | "saved" | "rejected" | "planned" | "favorite" | "approved" | "ordered" | "delivered" | "keeping" | "returning" | "returned";
  image?: string;
  retailer?: string;
  originalPrice?: string;
  size?: string;
  color?: string;
  ownerReaction?: string;
};

export type Contact = {
  id: string;
  name: string;
  context: string;
  organization?: string;
  location?: string;
  note?: string;
  phone?: string;
  email?: string;
  socialHandle?: string;
  tags?: string[];
  archived?: boolean;
};

export type ThingItem = {
  id: string;
  sectionId?: string;
  type: "note" | "action" | "idea" | "product" | "decision" | "link" | "person" | "place" | "event" | "reservation" | "file" | "checklist";
  title: string;
  body?: string;
  status?: string;
  owner?: "Jerry" | "Maria";
  dueAt?: string;
  contactId?: string;
  linkedThingId?: string;
  url?: string;
  position: number;
  archived?: boolean;
};

export type ThingSection = {
  id: string;
  title: string;
  body: string;
  description?: string;
  position: number;
  collapsed?: boolean;
  archived?: boolean;
  icon?: string;
};

export type CustomField = {
  id: string;
  label: string;
  key: string;
  type: CustomFieldType;
  value: unknown;
  options?: string[];
  position: number;
};

export type Order = {
  id: string;
  thingId: string;
  optionId?: string;
  retailer?: string;
  reference?: string;
  status: "planned" | "approved" | "ordered" | "shipped" | "delivered" | "returning" | "returned" | "cancelled";
  orderedAt?: string;
  expectedAt?: string;
  deliveredAt?: string;
  returnBy?: string;
  refundStatus?: string;
};

export type Activity = {
  id: string;
  thingId: string;
  actor: "Jerry" | "Maria" | "System";
  text: string;
  at: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
};

export type Thing = {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  icon?: string;
  coverUrl?: string;
  summary: string;
  ownerNextAction: string;
  assistantNextAction: string;
  category: Category;
  status: ThingStatus;
  permission: Permission;
  keepMoving: boolean;
  surpriseMe: boolean;
  archived: boolean;
  lastMoved: string;
  waitingOn?: string;
  location?: string;
  owner?: "Jerry" | "Maria";
  collaborators?: string[];
  priority?: "low" | "normal" | "high";
  budget?: { amount?: number; currency: string };
  tags?: string[];
  parentId?: string;
  relatedThingIds?: string[];
  dates: ThingDate[];
  contacts: Contact[];
  options: Option[];
  notes: { id: string; author: "Jerry" | "Maria"; body: string; at: string }[];
  links: { id: string; title: string; url: string }[];
  followUps: { id: string; waitingOn: string; date: string; channel?: string; note?: string; state: "drafted" | "attempted" }[];
  waiting?: { type: "owner" | "assistant" | "contact" | "date" | "delivery"; label: string; contactId?: string; followUpAt?: string; note?: string };
  sections: ThingSection[];
  items: ThingItem[];
  customFields: CustomField[];
};

export type Approval = {
  id: string;
  thingId: string;
  title: string;
  context: string;
  recommendation: string;
  whyNow: string;
  actionLabel: string;
  meta: string;
  status: "pending" | "approved" | "rejected" | "held";
  options?: { id: string; label: string; description?: string }[];
  amount?: number;
  currency?: string;
  urgency?: "low" | "normal" | "high";
  responses?: { id: string; action: string; reason?: string; note?: string; actor: "Jerry" | "Maria"; at: string }[];
};

export type Preference = {
  id: string;
  domain: string;
  attribute: string;
  statement: string;
  sentiment: "likes" | "dislikes" | "neutral";
  sourceType: string;
  sourceId?: string;
  confidence: number;
  confirmed: boolean;
  createdAt: string;
};

export type WorkspaceTemplate = {
  id: string;
  name: string;
  description: string;
  type: "blank" | "trip" | "event" | "shopping" | "personal_admin" | "business" | "restaurant_event" | "party";
  sections: { title: string; body?: string }[];
  fields: { label: string; type: CustomFieldType; options?: string[] }[];
  archived?: boolean;
};

export type InboxItem = {
  id: string;
  type: "text" | "link" | "voice" | "photo" | "file";
  raw: string;
  fileName?: string;
  status: "processing" | "needs_review" | "accepted" | "attached" | "failed";
  createdAt: string;
  proposal?: {
    title: string;
    summary: string;
    category: Category;
    status: ThingStatus;
    permission: Permission;
    relatedThingId?: string;
    extracted: string[];
    confidence: "High confidence" | "Please check";
  };
};

export type AppState = {
  schemaVersion: 3;
  revision: number;
  things: Thing[];
  approvals: Approval[];
  inbox: InboxItem[];
  activities: Activity[];
  contacts: Contact[];
  preferences: Preference[];
  templates: WorkspaceTemplate[];
  orders: Order[];
};

export const captureSchema = z.object({
  text: z.string().trim().min(2, "Add a little more detail first.").max(4000),
  type: z.enum(["text", "link", "voice", "photo", "file"]),
});

export const thingFilterValues = ["active", "needs-you", "done", "someday"] as const;
export type ThingFilter = (typeof thingFilterValues)[number];
export const thingFilterSchema = z.enum(thingFilterValues);

export const thingEditSchema = z.object({
  title: z.string().trim().min(1, "A Thing needs a title.").max(120),
  subtitle: z.string().trim().max(240).optional(),
  description: z.string().trim().max(6000).optional(),
  summary: z.string().trim().max(1200),
  ownerNextAction: z.string().trim().max(240),
  assistantNextAction: z.string().trim().max(240),
  category: z.enum(categoryValues),
  status: z.enum(statusValues),
  permission: z.enum(permissionValues),
  location: z.string().trim().max(180).optional(),
  owner: z.enum(["Jerry", "Maria"]).optional(),
  priority: z.enum(["low", "normal", "high"]).optional(),
  budgetAmount: z.number().min(0).optional(),
  budgetCurrency: z.string().trim().length(3).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(30).optional(),
  keepMoving: z.boolean(),
  surpriseMe: z.boolean(),
  date: z.object({
    label: z.string().trim().min(1).max(100),
    start: z.string().datetime({ offset: true }),
    end: z.string().datetime({ offset: true }).optional(),
    precision: z.enum(["exact", "range", "month", "unknown"]),
    readiness: z.string().trim().max(240),
    unresolved: z.number().int().min(0).max(999),
  }).optional(),
});

export type ThingEditInput = z.infer<typeof thingEditSchema>;

export const noteSchema = z.object({ thingId: z.string().min(1), body: z.string().trim().min(1).max(4000) });
export const movementSchema = z.object({
  thingId: z.string().min(1),
  update: z.string().trim().min(2).max(500),
  nextAction: z.string().trim().max(240).optional(),
  status: z.enum(statusValues).optional(),
});
export const followUpSchema = z.object({
  thingId: z.string().min(1), waitingOn: z.string().trim().min(1).max(120),
  date: z.string().datetime({ offset: true }), channel: z.string().trim().max(60).optional(),
  note: z.string().trim().max(500).optional(), state: z.enum(["drafted", "attempted"]),
});
export const linkSchema = z.object({ thingId: z.string().min(1), title: z.string().trim().min(1).max(160), url: z.url() });
export const optionSchema = z.object({
  thingId: z.string().min(1), name: z.string().trim().min(1).max(160), description: z.string().trim().max(600),
  price: z.string().trim().max(40).optional(), source: z.union([z.url(), z.literal("")]).optional(),
  recommendation: z.string().trim().max(500).optional(), tradeoff: z.string().trim().max(500).optional(),
});
export const approvalCreateSchema = z.object({
  thingId: z.string().min(1), title: z.string().trim().min(2).max(180), recommendation: z.string().trim().min(2).max(600),
  whyNow: z.string().trim().min(2).max(500), context: z.string().trim().max(600), actionLabel: z.string().trim().min(1).max(80),
  meta: z.string().trim().max(180), permission: z.enum(["APPROVE", "YOU"]),
});

export function parseThingFilter(value?: string): ThingFilter {
  return thingFilterSchema.catch("active").parse(value);
}

/** Collapses the stored pipeline into the three states the UI shows. */
export function displayStatus(status: ThingStatus): DisplayStatus {
  if (status === "Needs You") return "Needs You";
  if (status === "Done") return "Done";
  return "Open";
}

/** Keeps the stored status when it already reads as the chosen display state. */
export function statusFromDisplay(display: DisplayStatus, current: ThingStatus): ThingStatus {
  if (displayStatus(current) === display) return current;
  if (display === "Needs You") return "Needs You";
  if (display === "Done") return "Done";
  return "Moving";
}

export function nextActionFor(thing: Thing, role: Role) {
  if (thing.status === "Needs You" && thing.ownerNextAction) return thing.ownerNextAction;
  if (role === "assistant" && thing.assistantNextAction) return thing.assistantNextAction;
  return thing.assistantNextAction || thing.ownerNextAction || (thing.status === "Waiting" ? `Waiting on ${thing.waitingOn ?? "a response"}` : "No next move yet");
}

const transitions: Record<ThingStatus, ThingStatus[]> = {
  Inbox: ["Exploring", "Moving", "Someday"],
  Exploring: ["Moving", "Waiting", "Needs You", "Someday", "Done"],
  Moving: ["Waiting", "Needs You", "Ready", "Done", "Exploring"],
  Waiting: ["Moving", "Needs You", "Done"],
  "Needs You": ["Moving", "Ready", "Waiting", "Done"],
  Ready: ["Moving", "Done", "Needs You"],
  Done: [],
  Someday: ["Exploring", "Moving", "Done"],
};

export function canTransition(from: ThingStatus, to: ThingStatus) {
  return from === to || transitions[from].includes(to);
}

export function canResolveApproval(role: Role) {
  return role === "owner";
}

export function titleFromCapture(raw: string) {
  const cleaned = raw.replace(/https?:\/\/\S+/g, "").trim();
  if (/camp|tent|campsite/i.test(raw)) return "Camping — Red Oak";
  if (/trouser|wardrobe|denim/i.test(raw)) return "Fall Wardrobe";
  if (/cabin|wisconsin/i.test(raw)) return "Wisconsin Cabin Weekend";
  if (/oasis|paint|halloween/i.test(raw)) return "Oasis Halloween Concept";
  return cleaned.split(/[.!?]/)[0].split(" ").slice(0, 7).join(" ") || "New Thing";
}

export function categoryFromCapture(raw: string): Category {
  if (/buy|trouser|wardrobe|bottle|tent/i.test(raw)) return "Shopping";
  if (/trip|cabin|camp|wisconsin|travel/i.test(raw)) return "Trips & Experiences";
  if (/oasis|event|vendor|revenue/i.test(raw)) return "Business";
  if (/music|dj|creative/i.test(raw)) return "Creative";
  return "Personal";
}

export function permissionFromCapture(raw: string): Permission {
  return /buy|book|pay|send|reserve|vendor/i.test(raw) ? "APPROVE" : "GO";
}

export function makeProposal(raw: string): InboxItem["proposal"] {
  const relatedThingId = /camp|tent|campsite/i.test(raw) ? "camping-red-oak" : undefined;
  const dates = raw.match(/(?:sep(?:tember)?|dec(?:ember)?|christmas|fall)\s*\d{0,2}/gi) ?? [];
  return {
    title: titleFromCapture(raw),
    summary: raw.length > 150 ? `${raw.slice(0, 147)}…` : raw,
    category: categoryFromCapture(raw),
    status: relatedThingId ? "Moving" : /whenever|someday/i.test(raw) ? "Someday" : "Exploring",
    permission: permissionFromCapture(raw),
    relatedThingId,
    extracted: [
      ...(dates.length ? [`Date signal: ${dates.join(", ")}`] : []),
      ...(relatedThingId ? ["Likely related to Camping — Red Oak"] : []),
      ...(permissionFromCapture(raw) === "APPROVE" ? ["Money or commitment requires approval"] : []),
    ],
    confidence: raw.length > 18 ? "High confidence" : "Please check",
  };
}
