import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isStaffAdmin } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { StaffNav } from "./staff-nav";

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  if (!isStaffAdmin(user.email)) {
    logger.warn("Non-staff admin attempted to access /staff", {
      userId: user.id,
      email: user.email,
    });
    redirect("/dashboard");
  }

  return (
    <div style={{ padding: "var(--space-8) var(--space-4)" }}>
      <h1 style={{ marginBottom: "var(--space-6)" }}>Staff Admin</h1>
      <StaffNav />
      {children}
    </div>
  );
}
