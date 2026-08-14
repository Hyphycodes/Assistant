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

export type Category = (typeof categoryValues)[number];
export type ThingStatus = (typeof statusValues)[number];
export type Permission = (typeof permissionValues)[number];
export type Role = "owner" | "assistant";

export type ThingDate = {
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
  status: "recommended" | "considering" | "saved" | "rejected" | "planned";
  image?: string;
};

export type Contact = {
  id: string;
  name: string;
  context: string;
  organization?: string;
  location?: string;
  note?: string;
};

export type Activity = {
  id: string;
  thingId: string;
  actor: "Jerry" | "Maria" | "System";
  text: string;
  at: string;
};

export type Thing = {
  id: string;
  title: string;
  summary: string;
  category: Category;
  status: ThingStatus;
  permission: Permission;
  keepMoving: boolean;
  surpriseMe: boolean;
  archived: boolean;
  lastMoved: string;
  waitingOn?: string;
  location?: string;
  dates: ThingDate[];
  contacts: Contact[];
  options: Option[];
  notes: { id: string; author: "Jerry" | "Maria"; body: string; at: string }[];
  links: { id: string; title: string; url: string }[];
  sections: { id: string; title: string; body: string }[];
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
  things: Thing[];
  approvals: Approval[];
  inbox: InboxItem[];
  activities: Activity[];
};

export const captureSchema = z.object({
  text: z.string().trim().min(2, "Add a little more detail first.").max(4000),
  type: z.enum(["text", "link", "voice", "photo", "file"]),
});

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
