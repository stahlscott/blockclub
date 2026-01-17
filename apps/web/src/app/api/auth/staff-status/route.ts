import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isStaffAdmin } from "@/lib/auth";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ isStaffAdmin: false });
  }

  return NextResponse.json({ isStaffAdmin: isStaffAdmin(user.email) });
}
