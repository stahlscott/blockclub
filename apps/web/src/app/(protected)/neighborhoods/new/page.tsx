import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isStaffAdmin } from "@/lib/auth";
import { NewNeighborhoodForm } from "./form";

export default async function NewNeighborhoodPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/signin");
  }

  if (!isStaffAdmin(user.email)) {
    redirect("/dashboard");
  }

  return <NewNeighborhoodForm userId={user.id} userEmail={user.email || ""} />;
}
