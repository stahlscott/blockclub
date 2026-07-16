import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isStaffAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { StaffNav } from "./staff-nav";
import styles from "./staff-layout.module.css";

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

  if (!(await isStaffAdminUser(createAdminClient(), user.id))) {
    logger.warn("Non-staff admin attempted to access /staff", {
      userId: user.id,
      email: user.email,
    });
    redirect("/dashboard");
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Staff Admin</h1>
      <StaffNav />
      {children}
    </div>
  );
}
