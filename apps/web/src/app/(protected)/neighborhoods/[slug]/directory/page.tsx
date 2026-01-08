import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DirectoryClient } from "./directory-client";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function DirectoryPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/signin");
  }

  // Fetch neighborhood
  const { data: neighborhood } = await supabase
    .from("neighborhoods")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!neighborhood) {
    notFound();
  }

  // Check if user is a member
  const { data: membership } = await supabase
    .from("memberships")
    .select("*")
    .eq("neighborhood_id", neighborhood.id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!membership) {
    redirect(`/neighborhoods/${slug}`);
  }

  // Fetch all active members with their user profiles
  const { data: members } = await supabase
    .from("memberships")
    .select(
      `
      *,
      user:users(*)
    `,
    )
    .eq("neighborhood_id", neighborhood.id)
    .eq("status", "active")
    .order("joined_at", { ascending: true });

  return (
    <DirectoryClient
      slug={slug}
      neighborhoodName={neighborhood.name}
      members={members || []}
    />
  );
}
