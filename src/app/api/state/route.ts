import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { databaseConfigured, withDatabase } from "@/lib/database";
import { createDemo, isStore } from "@/lib/lending";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
const COOKIE = "luma_demo_session";
const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 30 };
const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: NextRequest) {
  if (!databaseConfigured()) return NextResponse.json({ mode: "browser" }, { headers });
  const previous = request.cookies.get(COOKIE)?.value;
  const id = previous && /^[a-f0-9]{64}$/.test(previous) ? previous : randomBytes(32).toString("hex");
  try {
    const state = await withDatabase(async client => {
      await client.query("INSERT INTO demo_workspaces (id, data) VALUES ($1, $2::jsonb) ON CONFLICT (id) DO NOTHING", [id, JSON.stringify(createDemo())]);
      const result = await client.query("SELECT data, revision FROM demo_workspaces WHERE id = $1", [id]);
      return result.rows[0];
    });
    const response = NextResponse.json({ mode: "postgres", store: state.data, revision: state.revision }, { headers });
    response.cookies.set(COOKIE, id, { ...cookieOptions, secure: request.nextUrl.protocol === "https:" });
    return response;
  } catch (error) {
    console.error("Luma database read failed:", error instanceof Error ? error.name : "Unknown error");
    return NextResponse.json({ error: "The demo database is temporarily unavailable. Please try again." }, { status: 503, headers });
  }
}

export async function PUT(request: NextRequest) {
  if (!databaseConfigured()) return NextResponse.json({ error: "Database is not configured." }, { status: 503, headers });
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).host !== request.headers.get("host")) return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers });
  const id = request.cookies.get(COOKIE)?.value;
  if (!id || !/^[a-f0-9]{64}$/.test(id)) return NextResponse.json({ error: "Reload the page to start a demo session." }, { status: 401, headers });
  try {
    const text = await request.text();
    if (text.length > 1000000) return NextResponse.json({ error: "Demo data exceeds the size limit." }, { status: 413, headers });
    const body = JSON.parse(text);
    if (!isStore(body.store) || !Number.isInteger(body.revision) || body.revision < 0) return NextResponse.json({ error: "Invalid demo data." }, { status: 400, headers });
    if (body.store.customers.length > 500 || body.store.loans.length > 500 || body.store.payments.length > 20000) return NextResponse.json({ error: "This demo workspace is full. Reset its sample data to continue." }, { status: 400, headers });
    const revision = await withDatabase(async client => {
      const result = await client.query("UPDATE demo_workspaces SET data = $2::jsonb, revision = revision + 1, updated_at = now() WHERE id = $1 AND revision = $3 RETURNING revision", [id, JSON.stringify(body.store), body.revision]);
      return result.rows[0]?.revision;
    });
    if (revision === undefined) return NextResponse.json({ error: "This demo was changed in another tab. Reload before making more changes." }, { status: 409, headers });
    return NextResponse.json({ revision }, { headers });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof TypeError) return NextResponse.json({ error: "Invalid demo data." }, { status: 400, headers });
    console.error("Luma database save failed:", error instanceof Error ? error.name : "Unknown error");
    return NextResponse.json({ error: "Your changes could not be saved to the database. Please try again." }, { status: 503, headers });
  }
}
