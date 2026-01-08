import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/auth";
import { NewNeighborhoodForm } from "./form";

export default async function NewNeighborhoodPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/signin");
  }

  if (!isSuperAdmin(user.email)) {
    redirect("/dashboard");
  }

  return <NewNeighborhoodForm userId={user.id} />;
}
