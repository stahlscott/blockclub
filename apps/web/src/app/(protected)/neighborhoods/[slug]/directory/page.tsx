import { getNeighborhoodAccess } from "@/lib/neighborhood-access";
import { DirectoryClient } from "./directory-client";
import { env } from "@/lib/env";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function DirectoryPage({ params }: Props) {
  const { slug } = await params;
  const { neighborhood, supabase } = await getNeighborhoodAccess(slug);

  // Fetch all active members with their user profiles
  // Note: Use FK hint for ambiguous relationship (memberships has multiple user FKs)
  const { data: members } = await supabase
    .from("memberships")
    .select(
      `
      *,
      user:users!memberships_user_id_fkey(*)
    `,
    )
    .eq("neighborhood_id", neighborhood.id)
    .eq("status", "active")
    .order("joined_at", { ascending: true });

  // Filter out superadmin users from the directory
  const filteredMembers = (members || []).filter(
    (m: any) => !env.STAFF_ADMIN_EMAILS.includes(m.user?.email || ""),
  );

  return (
    <DirectoryClient
      slug={slug}
      neighborhoodName={neighborhood.name}
      members={filteredMembers}
    />
  );
}
