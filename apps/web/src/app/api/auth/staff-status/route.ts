import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isStaffAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ isStaffAdmin: false });
  }

  const isStaffAdmin = await isStaffAdminUser(createAdminClient(), user.id);
  return NextResponse.json({ isStaffAdmin });
}
