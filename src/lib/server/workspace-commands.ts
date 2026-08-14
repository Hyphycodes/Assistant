import "server-only";

import { z } from "zod";
import {
  approvalCreateSchema,
  canTransition,
  captureSchema,
  customFieldTypeValues,
  followUpSchema,
  linkSchema,
  makeProposal,
  movementSchema,
  noteSchema,
  optionSchema,
  statusValues,
  thingEditSchema,
  type AppState,
  type Role,
  type Thing,
} from "@/lib/domain";

export type CommandResult = { state: AppState; message: string; id?: string };

function id() { return crypto.randomUUID(); }
function slug(title: string) { return `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "thing"}-${id().slice(0, 5)}`; }
function actor(role: Role) { return role === "owner" ? "Jerry" as const : "Maria" as const; }
function thingById(state: AppState, thingId: string) {
  const thing = state.things.find((item) => item.id === thingId);
  if (!thing) throw new Error("Thing not found.");
  return thing;
}
function log(state: AppState, role: Role, at: string, thingId: string, text: string, action: string, entityType = "thing", entityId = thingId, before?: unknown, after?: unknown) {
  state.activities.unshift({ id: id(), thingId, actor: actor(role), text, at, action, entityType, entityId, before, after });
  const thing = state.things.find((item) => item.id === thingId);
  if (thing) thing.lastMoved = at;
}
function parse<T extends z.ZodType>(schema: T, payload: unknown): z.infer<T> { return schema.parse(payload); }
const identifier = z.string().min(1);
const thingIdSchema = z.object({ thingId: identifier });
const childSchema = z.object({ thingId: identifier, childId: identifier });

export function applyWorkspaceCommand(source: AppState, role: Role, action: string, payload: unknown, at: string): CommandResult {
  const state = structuredClone(source);
  const who = actor(role);

  switch (action) {
    case "create_thing": {
      const input = parse(thingEditSchema.extend({ parentId: identifier.optional(), templateId: identifier.optional() }), payload);
      const template = input.templateId ? state.templates.find((item) => item.id === input.templateId) : undefined;
      const thingId = slug(input.title);
      const { date, budgetAmount, budgetCurrency, templateId, ...fields } = input;
      void templateId;
      const thing: Thing = {
        id: thingId, ...fields, archived: false, lastMoved: at,
        owner: fields.owner ?? "Jerry", priority: fields.priority ?? "normal", tags: fields.tags ?? [], collaborators: ["Maria"],
        budget: budgetAmount === undefined ? undefined : { amount: budgetAmount, currency: budgetCurrency ?? "USD" },
        dates: date ? [{ ...date, id: id() }] : [], contacts: [], options: [], notes: [], links: [], followUps: [],
        relatedThingIds: [], items: [], customFields: (template?.fields ?? []).map((field, position) => ({ id: id(), key: field.label.toLowerCase().replace(/\W+/g, "_"), label: field.label, type: field.type, value: field.type === "checkbox" ? false : "", options: field.options, position })),
        sections: (template?.sections ?? []).map((section, position) => ({ id: id(), title: section.title, body: section.body ?? "", position })),
      };
      state.things.unshift(thing);
      log(state, role, at, thingId, `${who} created ${thing.title}.`, "thing.created");
      return { state, message: "Thing created and saved.", id: thingId };
    }
    case "update_thing": {
      const input = parse(z.object({ id: identifier, changes: thingEditSchema }), payload);
      const thing = thingById(state, input.id);
      const before = structuredClone(thing);
      if (role === "assistant" && (input.changes.title !== thing.title || input.changes.category !== thing.category || input.changes.permission !== thing.permission)) throw new Error("Maria can edit operational context, but Jerry controls title, category, and permission.");
      const { date, budgetAmount, budgetCurrency, ...fields } = input.changes;
      Object.assign(thing, fields, { budget: budgetAmount === undefined ? thing.budget : { amount: budgetAmount, currency: budgetCurrency ?? "USD" } });
      if (date) thing.dates = [{ ...date, id: thing.dates[0]?.id ?? id() }, ...thing.dates.slice(1)];
      log(state, role, at, thing.id, `${who} updated the working brief.`, "thing.updated", "thing", thing.id, before, thing);
      return { state, message: "Thing saved." };
    }
    case "toggle_thing": {
      const input = parse(z.object({ id: identifier, key: z.enum(["keepMoving", "surpriseMe"]) }), payload);
      const thing = thingById(state, input.id); const before = thing[input.key]; thing[input.key] = !before;
      log(state, role, at, thing.id, `${who} ${thing[input.key] ? "enabled" : "disabled"} ${input.key === "keepMoving" ? "Keep Moving" : "Surprise Me"}.`, "thing.flag_changed", "thing", thing.id, before, thing[input.key]);
      return { state, message: "Preference saved." };
    }
    case "change_status": {
      const input = parse(z.object({ id: identifier, status: z.enum(statusValues) }), payload);
      const thing = thingById(state, input.id); const before = thing.status;
      if (!canTransition(before, input.status)) throw new Error(`${before} can’t move directly to ${input.status}.`);
      thing.status = input.status;
      log(state, role, at, thing.id, `${who} moved this from ${before} to ${input.status}.`, "thing.status_changed", "thing", thing.id, before, input.status);
      return { state, message: `Moved to ${input.status}.` };
    }
    case "archive_thing": case "restore_thing": {
      if (role !== "owner") throw new Error("Only Jerry can archive or restore Things.");
      const input = parse(z.object({ id: identifier }), payload); const thing = thingById(state, input.id); const restoring = action === "restore_thing";
      const before = { archived: thing.archived, status: thing.status }; thing.archived = !restoring; thing.status = restoring ? "Exploring" : "Done";
      log(state, role, at, thing.id, `${who} ${restoring ? "restored" : "archived"} ${thing.title}.`, restoring ? "thing.restored" : "thing.archived", "thing", thing.id, before, { archived: thing.archived, status: thing.status });
      return { state, message: restoring ? "Thing restored." : "Thing archived. Undo is available from Archive." };
    }
    case "duplicate_thing": {
      const input = parse(z.object({ thingId: identifier, title: z.string().trim().min(1).max(120).optional(), copyContacts: z.boolean().default(false) }), payload);
      const original = thingById(state, input.thingId); const duplicate = structuredClone(original); duplicate.id = slug(input.title ?? `${original.title} Copy`); duplicate.title = input.title ?? `${original.title} Copy`; duplicate.status = "Exploring"; duplicate.archived = false; duplicate.parentId = undefined; duplicate.lastMoved = at;
      const sectionIds = new Map<string, string>();
      duplicate.sections = original.sections.filter((section) => !section.archived).map((section) => { const nextId = id(); sectionIds.set(section.id, nextId); return { ...section, id: nextId, archived: false }; });
      duplicate.items = original.items.filter((item) => !item.archived).map((item) => ({ ...item, id: id(), sectionId: item.sectionId ? sectionIds.get(item.sectionId) : undefined, status: item.type === "action" || item.type === "checklist" ? "open" : item.status }));
      duplicate.customFields = original.customFields.map((field) => ({ ...field, id: id() })); duplicate.contacts = input.copyContacts ? structuredClone(original.contacts) : []; duplicate.notes = []; duplicate.followUps = [];
      state.things.unshift(duplicate); log(state, role, at, duplicate.id, `${who} duplicated ${original.title} as ${duplicate.title}.`, "thing.duplicated", "thing", duplicate.id, original.id, duplicate.id);
      return { state, message: "Thing duplicated without old conversation, approvals, or activity.", id: duplicate.id };
    }
    case "move_subthing": {
      const input = parse(z.object({ thingId: identifier, parentId: identifier.nullable() }), payload); const thing = thingById(state, input.thingId);
      if (input.parentId === thing.id) throw new Error("A Thing cannot be its own parent.");
      let cursor: string | null | undefined = input.parentId;
      while (cursor) { if (cursor === thing.id) throw new Error("That move would create a cycle."); cursor = state.things.find((item) => item.id === cursor)?.parentId; }
      const before = thing.parentId; thing.parentId = input.parentId ?? undefined; log(state, role, at, thing.id, `${who} ${input.parentId ? "moved this Thing under another Thing" : "promoted this Thing to the top level"}.`, "thing.parent_changed", "thing", thing.id, before, thing.parentId);
      return { state, message: input.parentId ? "Subthing moved." : "Thing promoted to top level." };
    }
    case "relate_thing": {
      const input = parse(z.object({ thingId: identifier, relatedThingId: identifier }), payload); if (input.thingId === input.relatedThingId) throw new Error("A Thing cannot relate to itself.");
      const thing = thingById(state, input.thingId); thingById(state, input.relatedThingId); thing.relatedThingIds = Array.from(new Set([...(thing.relatedThingIds ?? []), input.relatedThingId]));
      log(state, role, at, thing.id, `${who} related this Thing to another Thing.`, "thing.related"); return { state, message: "Related Thing added." };
    }
    case "add_section": {
      const input = parse(z.object({ thingId: identifier, title: z.string().trim().min(1).max(160), body: z.string().trim().max(6000).default("") }), payload); const thing = thingById(state, input.thingId); const sectionId = id();
      thing.sections.push({ id: sectionId, title: input.title, body: input.body, position: thing.sections.length }); log(state, role, at, thing.id, `${who} added the ${input.title} section.`, "section.created", "section", sectionId);
      return { state, message: "Section added.", id: sectionId };
    }
    case "update_section": {
      const input = parse(z.object({ thingId: identifier, sectionId: identifier, title: z.string().trim().min(1).max(160), body: z.string().trim().max(6000) }), payload); const thing = thingById(state, input.thingId); const section = thing.sections.find((item) => item.id === input.sectionId); if (!section) throw new Error("Section not found."); const before = structuredClone(section);
      Object.assign(section, { title: input.title, body: input.body }); log(state, role, at, thing.id, `${who} updated ${section.title}.`, "section.updated", "section", section.id, before, section); return { state, message: "Section saved." };
    }
    case "move_section": {
      const input = parse(z.object({ thingId: identifier, sectionId: identifier, direction: z.enum(["up", "down"]) }), payload); const thing = thingById(state, input.thingId); const visible = thing.sections.filter((section) => !section.archived).sort((a, b) => a.position - b.position); const index = visible.findIndex((section) => section.id === input.sectionId); const target = input.direction === "up" ? index - 1 : index + 1; if (index < 0 || target < 0 || target >= visible.length) throw new Error("Section is already at the edge."); [visible[index].position, visible[target].position] = [visible[target].position, visible[index].position]; log(state, role, at, thing.id, `${who} moved ${visible[index].title} ${input.direction}.`, "section.moved", "section", input.sectionId); return { state, message: "Section order saved." };
    }
    case "duplicate_section": {
      const input = parse(z.object({ thingId: identifier, sectionId: identifier }), payload); const thing = thingById(state, input.thingId); const section = thing.sections.find((item) => item.id === input.sectionId); if (!section) throw new Error("Section not found."); const sectionId = id(); thing.sections.push({ ...section, id: sectionId, title: `${section.title} Copy`, position: thing.sections.length, archived: false }); thing.items.push(...thing.items.filter((item) => item.sectionId === section.id && !item.archived).map((item) => ({ ...item, id: id(), sectionId, status: item.type === "action" ? "open" : item.status }))); log(state, role, at, thing.id, `${who} duplicated ${section.title}.`, "section.duplicated", "section", sectionId); return { state, message: "Section duplicated.", id: sectionId };
    }
    case "remove_section": case "restore_section": {
      const input = parse(childSchema, payload); const thing = thingById(state, input.thingId); const section = thing.sections.find((item) => item.id === input.childId); if (!section) throw new Error("Section not found."); section.archived = action === "remove_section"; log(state, role, at, thing.id, `${who} ${section.archived ? "archived" : "restored"} ${section.title}.`, section.archived ? "section.archived" : "section.restored", "section", section.id); return { state, message: section.archived ? "Section archived. Undo is available." : "Section restored." };
    }
    case "add_item": {
      const input = parse(z.object({ thingId: identifier, sectionId: identifier.optional(), type: z.enum(["note","action","idea","product","decision","link","person","place","event","reservation","file","checklist"]), title: z.string().trim().min(1).max(200), body: z.string().trim().max(4000).optional() }), payload); const thing = thingById(state, input.thingId); if (input.sectionId && !thing.sections.some((section) => section.id === input.sectionId && !section.archived)) throw new Error("Choose an active section."); const itemId = id(); thing.items.push({ id: itemId, sectionId: input.sectionId, type: input.type, title: input.title, body: input.body, position: thing.items.filter((item) => item.sectionId === input.sectionId).length }); log(state, role, at, thing.id, `${who} added ${input.title}.`, "item.created", "item", itemId); return { state, message: "Item added.", id: itemId };
    }
    case "update_item": {
      const input = parse(z.object({ thingId: identifier, itemId: identifier, changes: z.object({ title: z.string().trim().min(1).max(200).optional(), body: z.string().trim().max(4000).optional(), status: z.string().trim().max(60).optional(), owner: z.enum(["Jerry", "Maria"]).optional(), dueAt: z.string().datetime({ offset: true }).optional(), sectionId: identifier.nullable().optional() }) }), payload); const thing = thingById(state, input.thingId); const item = thing.items.find((candidate) => candidate.id === input.itemId); if (!item) throw new Error("Item not found."); const before = structuredClone(item); Object.assign(item, input.changes, { sectionId: input.changes.sectionId === null ? undefined : input.changes.sectionId ?? item.sectionId }); log(state, role, at, thing.id, `${who} updated ${item.title}.`, "item.updated", "item", item.id, before, item); return { state, message: "Item saved." };
    }
    case "remove_item": case "restore_item": {
      const input = parse(childSchema, payload); const thing = thingById(state, input.thingId); const item = thing.items.find((candidate) => candidate.id === input.childId); if (!item) throw new Error("Item not found."); item.archived = action === "remove_item"; log(state, role, at, thing.id, `${who} ${item.archived ? "archived" : "restored"} ${item.title}.`, item.archived ? "item.archived" : "item.restored", "item", item.id); return { state, message: item.archived ? "Item archived." : "Item restored." };
    }
    case "add_custom_field": {
      const input = parse(z.object({ thingId: identifier, label: z.string().trim().min(1).max(80), type: z.enum(customFieldTypeValues), options: z.array(z.string().trim().min(1)).optional() }), payload); const thing = thingById(state, input.thingId); const fieldId = id(); thing.customFields.push({ id: fieldId, label: input.label, key: `${input.label.toLowerCase().replace(/\W+/g, "_")}_${fieldId.slice(0, 4)}`, type: input.type, value: input.type === "checkbox" ? false : "", options: input.options, position: thing.customFields.length }); log(state, role, at, thing.id, `${who} added the ${input.label} field.`, "custom_field.created", "custom_field", fieldId); return { state, message: "Custom field added.", id: fieldId };
    }
    case "update_custom_field": {
      const input = parse(z.object({ thingId: identifier, fieldId: identifier, label: z.string().trim().min(1).max(80).optional(), value: z.unknown() }), payload); const thing = thingById(state, input.thingId); const field = thing.customFields.find((candidate) => candidate.id === input.fieldId); if (!field) throw new Error("Custom field not found."); const before = field.value; if (input.label) field.label = input.label; field.value = input.value; log(state, role, at, thing.id, `${who} changed ${field.label} from ${String(before || "empty")} to ${String(input.value || "empty")}.`, "custom_field.updated", "custom_field", field.id, before, input.value); return { state, message: "Field saved." };
    }
    case "remove_custom_field": {
      const input = parse(childSchema, payload); const thing = thingById(state, input.thingId); const index = thing.customFields.findIndex((field) => field.id === input.childId); if (index < 0) throw new Error("Custom field not found."); const [field] = thing.customFields.splice(index, 1); log(state, role, at, thing.id, `${who} removed the ${field.label} field.`, "custom_field.removed", "custom_field", field.id); return { state, message: "Custom field removed." };
    }
    case "add_note": {
      const input = parse(noteSchema, payload); const thing = thingById(state, input.thingId); const noteId = id();
      if (input.itemId) {
        const item = thing.items.find((candidate) => candidate.id === input.itemId && !candidate.archived);
        if (!item) throw new Error("Plan item not found.");
        item.notes = [{ id: noteId, author: who, body: input.body, at }, ...(item.notes ?? [])];
        log(state, role, at, thing.id, `${who} added a note to ${item.title}.`, "item.note_created", "item", item.id);
        return { state, message: "Note added to this item.", id: noteId };
      }
      thing.notes.unshift({ id: noteId, author: who, body: input.body, at }); log(state, role, at, thing.id, `${who} added a note.`, "note.created", "note", noteId); return { state, message: "Note added.", id: noteId };
    }
    case "update_note": {
      const input = parse(z.object({ thingId: identifier, noteId: identifier, body: z.string().trim().min(1).max(4000) }), payload); const thing = thingById(state, input.thingId); const note = thing.notes.find((candidate) => candidate.id === input.noteId); if (!note || note.author !== who) throw new Error("You can only edit your own note."); const before = note.body; note.body = input.body; note.at = at; log(state, role, at, thing.id, `${who} refined a note.`, "note.updated", "note", note.id, before, note.body); return { state, message: "Note updated." };
    }
    case "delete_note": {
      const input = parse(childSchema, payload); const thing = thingById(state, input.thingId); const note = thing.notes.find((candidate) => candidate.id === input.childId); if (!note || note.author !== who) throw new Error("You can only remove your own note."); thing.notes = thing.notes.filter((candidate) => candidate.id !== note.id); log(state, role, at, thing.id, `${who} removed a note.`, "note.removed", "note", note.id, note.body); return { state, message: "Note removed." };
    }
    case "add_link": case "update_link": {
      const schema = action === "add_link" ? linkSchema : linkSchema.extend({ linkId: identifier }); const input = parse(schema, payload); const thing = thingById(state, input.thingId);
      if (action === "add_link") { const linkId = id(); const item = input.itemId ? thing.items.find((candidate) => candidate.id === input.itemId && !candidate.archived) : undefined; if (input.itemId && !item) throw new Error("Plan item not found."); thing.links.unshift({ id: linkId, title: input.title, url: input.url, itemId: input.itemId }); log(state, role, at, thing.id, item ? `${who} added a link to ${item.title}.` : `${who} added a source link.`, "link.created", item ? "item" : "link", item?.id ?? linkId); return { state, message: item ? "Link added to this item." : "Link added.", id: linkId }; }
      const linkId = (input as typeof input & { linkId: string }).linkId; const link = thing.links.find((candidate) => candidate.id === linkId); if (!link) throw new Error("Link not found."); const before = structuredClone(link); Object.assign(link, { title: input.title, url: input.url }); log(state, role, at, thing.id, `${who} updated a source link.`, "link.updated", "link", link.id, before, link); return { state, message: "Link updated." };
    }
    case "remove_link": {
      const input = parse(childSchema, payload); const thing = thingById(state, input.thingId); thing.links = thing.links.filter((link) => link.id !== input.childId); log(state, role, at, thing.id, `${who} removed a source link.`, "link.removed", "link", input.childId); return { state, message: "Link removed." };
    }
    case "add_option": case "update_option": {
      const schema = action === "add_option" ? optionSchema : optionSchema.extend({ optionId: identifier, status: z.string() }); const input = parse(schema, payload); const thing = thingById(state, input.thingId);
      if (action === "add_option") { const optionId = id(); const item = input.itemId ? thing.items.find((candidate) => candidate.id === input.itemId && !candidate.archived) : undefined; if (input.itemId && !item) throw new Error("Plan item not found."); thing.options.unshift({ id: optionId, itemId: input.itemId, name: input.name, description: input.description, price: input.price, source: input.source, recommendation: input.recommendation, tradeoff: input.tradeoff, status: "considering" }); if (item) item.recentSummary = `${who} added an option · today`; log(state, role, at, thing.id, item ? `${who} added ${input.name} to ${item.title}.` : `${who} added ${input.name} as an option.`, "product.created", item ? "item" : "product", item?.id ?? optionId); return { state, message: item ? "Option added inside the plan." : "Option added.", id: optionId }; }
      const optionId = (input as typeof input & { optionId: string }).optionId; const option = thing.options.find((candidate) => candidate.id === optionId); if (!option) throw new Error("Option not found."); const before = structuredClone(option); Object.assign(option, input); log(state, role, at, thing.id, `${who} updated ${option.name}.`, "product.updated", "product", option.id, before, option); return { state, message: "Option updated." };
    }
    case "remove_option": {
      const input = parse(childSchema, payload); const thing = thingById(state, input.thingId); thing.options = thing.options.filter((option) => option.id !== input.childId); log(state, role, at, thing.id, `${who} removed an option.`, "product.removed", "product", input.childId); return { state, message: "Option removed." };
    }
    case "update_product_status": {
      const input = parse(z.object({ thingId: identifier, optionId: identifier, status: z.enum(["recommended","considering","saved","rejected","planned","favorite","approved","ordered","delivered","keeping","returning","returned"]), reaction: z.string().trim().max(500).optional() }), payload); const thing = thingById(state, input.thingId); const option = thing.options.find((candidate) => candidate.id === input.optionId); if (!option) throw new Error("Product not found."); const before = option.status; option.status = input.status; option.ownerReaction = input.reaction; log(state, role, at, thing.id, `${who} moved ${option.name} from ${before} to ${input.status}.`, "product.status_changed", "product", option.id, before, input.status); return { state, message: "Product status saved." };
    }
    case "create_order": case "update_order": {
      const schema = z.object({ thingId: identifier, orderId: identifier.optional(), optionId: identifier.optional(), retailer: z.string().trim().max(100).optional(), reference: z.string().trim().max(100).optional(), status: z.enum(["planned","approved","ordered","shipped","delivered","returning","returned","cancelled"]), orderedAt: z.string().datetime({ offset: true }).optional(), expectedAt: z.string().datetime({ offset: true }).optional(), deliveredAt: z.string().datetime({ offset: true }).optional(), returnBy: z.string().datetime({ offset: true }).optional(), refundStatus: z.string().trim().max(100).optional() }); const input = parse(schema, payload); thingById(state, input.thingId);
      if (action === "create_order") { const orderId = id(); state.orders.unshift({ id: orderId, ...input }); log(state, role, at, input.thingId, `${who} created an order record in ${input.status} state.`, "order.created", "order", orderId); return { state, message: "Order created.", id: orderId }; }
      const order = state.orders.find((candidate) => candidate.id === input.orderId); if (!order) throw new Error("Order not found."); const before = structuredClone(order); Object.assign(order, input); log(state, role, at, input.thingId, `${who} updated the order from ${before.status} to ${order.status}.`, "order.updated", "order", order.id, before, order); return { state, message: "Order updated." };
    }
    case "record_movement": {
      const input = parse(movementSchema, payload); const thing = thingById(state, input.thingId); if (input.nextAction) thing.assistantNextAction = input.nextAction; if (input.status && canTransition(thing.status, input.status)) thing.status = input.status; log(state, role, at, thing.id, input.update, "movement.recorded"); return { state, message: "Movement recorded. Jerry can see it on Home." };
    }
    case "add_follow_up": {
      const input = parse(followUpSchema, payload); const thing = thingById(state, input.thingId); const followUpId = id(); thing.waitingOn = input.waitingOn; thing.waiting = { type: "contact", label: input.waitingOn, followUpAt: input.date, note: input.note }; thing.status = "Waiting"; thing.followUps.unshift({ id: followUpId, waitingOn: input.waitingOn, date: input.date, note: input.note, channel: input.channel, state: input.state }); log(state, role, at, thing.id, `${who} marked this Waiting on ${input.waitingOn}.`, "waiting.created", "waiting", followUpId); return { state, message: "Waiting state and follow-up saved. Nothing was sent." };
    }
    case "mark_waiting": {
      const input = parse(z.object({ thingId: identifier, waitingOn: z.string().trim().min(1), waitingType: z.enum(["owner","assistant","contact","date","delivery"]), date: z.string().datetime({ offset: true }), note: z.string().trim().max(500).optional(), contactId: identifier.optional() }), payload); const thing = thingById(state, input.thingId); const followUpId = id(); thing.waitingOn = input.waitingOn; thing.waiting = { type: input.waitingType, label: input.waitingOn, followUpAt: input.date, note: input.note, contactId: input.contactId }; thing.status = "Waiting"; thing.followUps.unshift({ id: followUpId, waitingOn: input.waitingOn, date: input.date, note: input.note, state: "drafted" }); log(state, role, at, thing.id, `${who} marked this Waiting on ${input.waitingOn}.`, "waiting.created", "waiting", followUpId); return { state, message: "Waiting state and follow-up saved. Nothing was sent." };
    }
    case "mark_responded": {
      const input = parse(thingIdSchema, payload); const thing = thingById(state, input.thingId); const before = thing.waiting; thing.waiting = undefined; thing.waitingOn = undefined; thing.status = "Moving"; log(state, role, at, thing.id, `${who} recorded a response and cleared Waiting.`, "waiting.resolved", "waiting", thing.id, before, null); return { state, message: "Response recorded; Waiting cleared." };
    }
    case "create_approval": {
      const input = parse(approvalCreateSchema.extend({ options: z.array(z.object({ label: z.string().trim().min(1), description: z.string().trim().max(300).optional() })).max(8).optional(), amount: z.number().min(0).optional(), urgency: z.enum(["low","normal","high"]).optional() }), payload); const thing = thingById(state, input.thingId); const approvalId = id(); state.approvals.unshift({ id: approvalId, thingId: input.thingId, title: input.title, recommendation: input.recommendation, whyNow: input.whyNow, context: input.context, actionLabel: input.actionLabel, meta: input.meta, status: "pending", options: input.options?.map((option) => ({ id: id(), ...option })), amount: input.amount, currency: input.amount === undefined ? undefined : "USD", urgency: input.urgency ?? "normal", responses: [] }); thing.status = "Needs You"; thing.ownerNextAction = input.title; thing.waitingOn = "Jerry"; log(state, role, at, thing.id, `${who} prepared a decision for Jerry: ${input.title}.`, "approval.created", "approval", approvalId); return { state, message: "Decision prepared for Jerry.", id: approvalId };
    }
    case "update_approval": {
      const input = parse(z.object({ id: identifier, title: z.string().trim().min(2), recommendation: z.string().trim().min(2) }), payload); const approval = state.approvals.find((item) => item.id === input.id); if (!approval) throw new Error("Decision not found."); Object.assign(approval, input); return { state, message: "Decision updated." };
    }
    case "resolve_approval": {
      if (role !== "owner") throw new Error("Only Jerry can resolve this decision."); const input = parse(z.object({ id: identifier, status: z.enum(["approved","rejected","held"]), reason: z.string().trim().max(100).optional(), note: z.string().trim().max(500).optional() }), payload); const approval = state.approvals.find((item) => item.id === input.id); if (!approval || approval.status !== "pending") throw new Error("Decision is no longer pending."); approval.status = input.status; approval.responses = [...(approval.responses ?? []), { id: id(), action: input.status, reason: input.reason, note: input.note, actor: "Jerry", at }]; const thing = approval.thingId ? thingById(state, approval.thingId) : undefined; if (thing && input.status === "approved") { thing.status = "Moving"; thing.waitingOn = undefined; } if (input.status === "rejected" && input.reason) state.preferences.unshift({ id: id(), domain: thing?.category ?? "general", attribute: "rejection reason", statement: `${input.reason}${input.note ? `: ${input.note}` : ""}`, sentiment: "dislikes", sourceType: "approval response", sourceId: approval.id, confidence: .9, confirmed: true, createdAt: at }); if (thing) log(state, role, at, thing.id, `${who} ${input.status} ${approval.title}${input.reason ? ` — ${input.reason}` : ""}.`, "approval.resolved", "approval", approval.id, "pending", input); return { state, message: input.status === "approved" ? "Approved. Maria can keep this moving." : input.status === "held" ? "Saved for later." : "Rejected with your preference recorded." };
    }
    case "capture_inbox": {
      const input = parse(captureSchema.extend({ text: z.string().trim().min(2), fileName: z.string().trim().max(255).optional() }), payload); const captureId = id(); const proposal = makeProposal(input.text); const target = proposal?.relatedThingId ? state.things.find((thing) => thing.id === proposal.relatedThingId && !thing.archived) : undefined;
      const capture = { id: captureId, type: input.type, raw: input.text, fileName: input.fileName, status: target ? "attached" as const : "needs_review" as const, createdAt: at, proposal }; state.inbox.unshift(capture);
      if (target && proposal) { const section = target.sections.find((item) => !item.archived && item.title.toLowerCase().includes("tent")); const itemId = id(); target.items.push({ id: itemId, sectionId: section?.id, type: "idea", title: proposal.summary, body: `Original capture (${captureId}): ${input.text}`, position: target.items.length }); log(state, role, at, target.id, `${who} captured a thought into ${section?.title ?? target.title}.`, "inbox.auto_filed", "item", itemId); return { state, message: `Added to ${target.title}${section ? ` → ${section.title}` : ""}.`, id: captureId }; }
      return { state, message: "Saved. Choose where this should go.", id: captureId };
    }
    case "accept_proposal": {
      const input = parse(z.object({ id: identifier, mode: z.enum(["create","attach"]), sectionId: identifier.optional(), itemType: z.enum(["note","action","idea","product","decision","link","person","place","event","reservation","file","checklist"]).optional(), targetThingId: identifier.optional() }), payload); const capture = state.inbox.find((item) => item.id === input.id); if (!capture?.proposal) throw new Error("Capture proposal not found."); const targetId = input.mode === "attach" ? input.targetThingId ?? capture.proposal.relatedThingId : undefined;
      if (targetId) { const thing = thingById(state, targetId); const itemId = id(); thing.items.push({ id: itemId, sectionId: input.sectionId, type: input.itemType ?? "idea", title: capture.proposal.summary, body: `Original capture: ${capture.raw}`, position: thing.items.length }); capture.status = "attached"; log(state, role, at, thing.id, `${who} attached an Inbox capture as an editable ${input.itemType ?? "idea"}.`, "inbox.attached", "item", itemId); return { state, message: "Capture attached; the original remains in Inbox history.", id: itemId }; }
      const thingId = slug(capture.proposal.title); state.things.unshift({ id: thingId, title: capture.proposal.title, summary: capture.proposal.summary, ownerNextAction: "Review this new Thing.", assistantNextAction: "Choose the first useful next move.", category: capture.proposal.category, status: capture.proposal.status, permission: capture.proposal.permission, keepMoving: false, surpriseMe: false, archived: false, lastMoved: at, owner: "Jerry", collaborators: ["Maria"], priority: "normal", tags: [], relatedThingIds: [], dates: [], contacts: [], options: [], notes: [], links: [], followUps: [], sections: [], items: [], customFields: [] }); capture.status = "accepted"; log(state, role, at, thingId, `${who} turned an Inbox capture into a Thing.`, "inbox.converted"); return { state, message: "Capture turned into a Thing.", id: thingId };
    }
    case "dismiss_inbox": {
      const input = parse(z.object({ id: identifier }), payload); const capture = state.inbox.find((item) => item.id === input.id); if (!capture) throw new Error("Capture not found."); capture.status = "failed"; return { state, message: "Proposal dismissed; the raw capture remains searchable." };
    }
    case "reopen_inbox": {
      const input = parse(z.object({ id: identifier }), payload); const capture = state.inbox.find((item) => item.id === input.id); if (!capture) throw new Error("Capture not found.");
      for (const thing of state.things) thing.items = thing.items.filter((item) => !item.body?.includes(`Original capture (${capture.id})`)); capture.status = "needs_review"; return { state, message: "Capture reopened. Choose where it belongs." };
    }
    case "create_contact": case "update_contact": {
      const schema = z.object({ id: identifier.optional(), name: z.string().trim().min(1).max(120), context: z.string().trim().max(200), organization: z.string().trim().max(160).optional(), location: z.string().trim().max(160).optional(), note: z.string().trim().max(2000).optional(), phone: z.string().trim().max(50).optional(), email: z.union([z.email(), z.literal("")]).optional(), socialHandle: z.string().trim().max(100).optional(), tags: z.array(z.string().trim().min(1)).max(30).optional() }); const input = parse(schema, payload);
      if (action === "create_contact") { const contactId = id(); state.contacts.unshift({ id: contactId, ...input, tags: input.tags ?? [] }); return { state, message: "Contact created.", id: contactId }; }
      const contact = state.contacts.find((item) => item.id === input.id); if (!contact) throw new Error("Contact not found."); Object.assign(contact, input); return { state, message: "Contact saved." };
    }
    case "archive_contact": {
      const input = parse(z.object({ id: identifier }), payload); const contact = state.contacts.find((item) => item.id === input.id); if (!contact) throw new Error("Contact not found."); contact.archived = !contact.archived; return { state, message: contact.archived ? "Contact archived." : "Contact restored." };
    }
    case "attach_contact": {
      const input = parse(z.object({ thingId: identifier, contactId: identifier }), payload); const thing = thingById(state, input.thingId); const contact = state.contacts.find((item) => item.id === input.contactId); if (!contact || contact.archived) throw new Error("Contact not found.");
      if (!thing.contacts.some((item) => item.id === contact.id)) thing.contacts.push(structuredClone(contact));
      log(state, role, at, thing.id, `${who} connected ${contact.name} to this Thing.`, "contact.attached", "contact", contact.id); return { state, message: "Contact connected." };
    }
    case "create_template": {
      const input = parse(z.object({ name: z.string().trim().min(1).max(120), description: z.string().trim().max(500), type: z.enum(["blank","trip","event","shopping","personal_admin","business","restaurant_event","party"]), sections: z.array(z.object({ title: z.string().trim().min(1), body: z.string().optional() })), fields: z.array(z.object({ label: z.string().trim().min(1), type: z.enum(customFieldTypeValues), options: z.array(z.string()).optional() })) }), payload); const templateId = id(); state.templates.unshift({ id: templateId, ...input }); return { state, message: "Template saved.", id: templateId };
    }
    default: throw new Error(`Unsupported workspace action: ${action}`);
  }
}
