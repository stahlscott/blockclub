import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isStaffAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NewNeighborhoodForm } from "./form";

export default async function NewNeighborhoodPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/signin");
  }

  if (!(await isStaffAdminUser(createAdminClient(), user.id))) {
    redirect("/dashboard");
  }

  return <NewNeighborhoodForm />;
}
