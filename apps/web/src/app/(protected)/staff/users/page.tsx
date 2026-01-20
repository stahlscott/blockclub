import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isStaffAdmin } from "@/lib/auth";
import { UserSearch } from "./user-search";

export default async function StaffUsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isStaffAdmin(user.email)) {
    redirect("/dashboard");
  }

  return <UserSearch />;
}
