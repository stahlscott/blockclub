import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureNeighborhoodMembership } from "@/lib/ensure-membership";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as { neighborhoodId?: string };
  if (!body.neighborhoodId) return NextResponse.json({ success: false, error: "neighborhoodId is required" }, { status: 400 });

  const result = await ensureNeighborhoodMembership(supabase, user.id, body.neighborhoodId);
  if (!result.success) return NextResponse.json(result, { status: 409 });
  return NextResponse.json(result);
}
