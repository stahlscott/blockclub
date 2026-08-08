import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isStaffAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { UserSearch } from "./user-search";

export default async function StaffUsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !(await isStaffAdminUser(createAdminClient(), user.id))) {
    redirect("/dashboard");
  }

  return <UserSearch />;
}
