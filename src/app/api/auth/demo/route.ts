import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ role: z.enum(["owner", "assistant"]) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid demo profile." }, { status: 400 });
  const response = NextResponse.json({ ok: true, role: parsed.data.role });
  response.cookies.set("hyphy_session", `demo:${parsed.data.role}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}
