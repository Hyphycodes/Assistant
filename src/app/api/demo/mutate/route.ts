import { NextResponse } from "next/server";
import { z } from "zod";
import {
  approvalCreateSchema,
  followUpSchema,
  linkSchema,
  movementSchema,
  noteSchema,
  optionSchema,
  thingEditSchema,
} from "@/lib/domain";
import { requireWorkspaceSession } from "@/lib/server/auth";

const actionSchema = z.enum([
  "create_thing",
  "update_thing",
  "toggle_thing",
  "change_status",
  "archive_thing",
  "add_note",
  "update_note",
  "delete_note",
  "update_section",
  "remove_section",
  "add_link",
  "update_link",
  "remove_link",
  "add_option",
  "update_option",
  "remove_option",
  "record_movement",
  "add_follow_up",
  "create_approval",
  "update_approval",
  "resolve_approval",
  "capture_inbox",
  "accept_proposal",
  "dismiss_inbox",
]);

const requestSchema = z.object({ action: actionSchema, payload: z.unknown() });
const idSchema = z.object({ id: z.string().min(1) });
const updateThingSchema = z.object({
  id: z.string().min(1),
  changes: thingEditSchema.partial(),
});
const toggleSchema = z.object({
  id: z.string().min(1),
  key: z.enum(["keepMoving", "surpriseMe"]),
});
const statusSchema = z.object({
  id: z.string().min(1),
  status: z.enum([
    "Inbox",
    "Exploring",
    "Moving",
    "Waiting",
    "Needs You",
    "Ready",
    "Done",
    "Someday",
  ]),
});
const noteUpdateSchema = z.object({
  thingId: z.string().min(1),
  noteId: z.string().min(1),
  body: z.string().trim().min(1).max(4000),
});
const childDeleteSchema = z.object({
  thingId: z.string().min(1),
  childId: z.string().min(1),
});
const sectionUpdateSchema = z.object({
  thingId: z.string().min(1),
  sectionId: z.string().min(1),
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().max(6000),
});
const linkUpdateSchema = z.object({
  thingId: z.string().min(1),
  linkId: z.string().min(1),
  title: z.string().trim().min(1).max(160),
  url: z.url(),
});
const optionUpdateSchema = optionSchema.extend({
  optionId: z.string().min(1),
  status: z.enum([
    "recommended",
    "considering",
    "saved",
    "rejected",
    "planned",
  ]),
});
const approvalUpdateSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(2).max(180),
  recommendation: z.string().trim().min(2).max(600),
});
const resolutionSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["approved", "rejected", "held"]),
});
const captureInboxSchema = z.object({
  raw: z.string().trim().min(2).max(4000),
  type: z.enum(["text", "link", "voice", "photo", "file"]),
  fileName: z.string().trim().max(255).optional(),
});
const acceptProposalSchema = z.object({
  id: z.string().min(1),
  mode: z.enum(["create", "attach"]),
});

function validate(action: z.infer<typeof actionSchema>, payload: unknown) {
  switch (action) {
    case "create_thing":
      return thingEditSchema.parse(payload);
    case "update_thing":
      return updateThingSchema.parse(payload);
    case "toggle_thing":
      return toggleSchema.parse(payload);
    case "change_status":
      return statusSchema.parse(payload);
    case "archive_thing":
      return idSchema.parse(payload);
    case "add_note":
      return noteSchema.parse(payload);
    case "update_note":
      return noteUpdateSchema.parse(payload);
    case "delete_note":
    case "remove_section":
    case "remove_link":
    case "remove_option":
      return childDeleteSchema.parse(payload);
    case "update_section":
      return sectionUpdateSchema.parse(payload);
    case "add_link":
      return linkSchema.parse(payload);
    case "update_link":
      return linkUpdateSchema.parse(payload);
    case "add_option":
      return optionSchema.parse(payload);
    case "update_option":
      return optionUpdateSchema.parse(payload);
    case "record_movement":
      return movementSchema.parse(payload);
    case "add_follow_up":
      return followUpSchema.parse(payload);
    case "create_approval":
      return approvalCreateSchema.parse(payload);
    case "update_approval":
      return approvalUpdateSchema.parse(payload);
    case "resolve_approval":
      return resolutionSchema.parse(payload);
    case "capture_inbox":
      return captureInboxSchema.parse(payload);
    case "accept_proposal":
      return acceptProposalSchema.parse(payload);
    case "dismiss_inbox":
      return idSchema.parse(payload);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireWorkspaceSession();
    const body = requestSchema.parse(await request.json());
    const payload = validate(body.action, body.payload);

    if (
      ["resolve_approval", "archive_thing"].includes(body.action) &&
      session.role !== "owner"
    ) {
      return NextResponse.json(
        { error: "Only the owner can perform this action." },
        { status: 403 },
      );
    }
    if (body.action === "update_thing" && session.role === "assistant") {
      const changes = (payload as z.infer<typeof updateThingSchema>).changes;
      const ownerOnlyFields = ["title", "category", "permission"] as const;
      if (ownerOnlyFields.some((field) => field in changes)) {
        return NextResponse.json(
          {
            error:
              "Maria can edit operational context, but owner fields stay with Jerry.",
          },
          { status: 403 },
        );
      }
    }

    return NextResponse.json({
      ok: true,
      actor: session.role === "owner" ? "Jerry" : "Maria",
      workspaceId: session.workspaceId,
      authorizedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid change." },
        { status: 400 },
      );
    const message = error instanceof Error ? error.message : "Mutation failed.";
    return NextResponse.json(
      {
        error:
          message === "UNAUTHENTICATED"
            ? "Sign in again to continue."
            : message,
      },
      { status: message === "UNAUTHENTICATED" ? 401 : 500 },
    );
  }
}
