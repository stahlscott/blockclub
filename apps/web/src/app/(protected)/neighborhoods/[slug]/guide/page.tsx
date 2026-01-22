import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getNeighborhoodAccess } from "@/lib/neighborhood-access";
import { GuideClient } from "./guide-client";
import type { NeighborhoodGuideWithUpdatedBy } from "@blockclub/shared";
import styles from "./guide.module.css";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const { user, neighborhood, isNeighborhoodAdmin, supabase } =
    await getNeighborhoodAccess(slug);

  // Fetch guide with the user who last updated it
  const { data: guide } = await supabase
    .from("neighborhood_guides")
    .select(
      `
      *,
      updated_by_user:users!updated_by(id, name, avatar_url)
    `
    )
    .eq("neighborhood_id", neighborhood.id)
    .maybeSingle();

  // Type the guide data properly
  const typedGuide = guide as NeighborhoodGuideWithUpdatedBy | null;

  return (
    <div className={styles.container}>
      <div className={styles.topRow}>
        <Link href="/dashboard" className={styles.backButton}>
          <ArrowLeft className={styles.backButtonIcon} />
          Dashboard
        </Link>
      </div>

      <GuideClient
        guide={typedGuide}
        neighborhoodId={neighborhood.id}
        neighborhoodName={neighborhood.name}
        isAdmin={isNeighborhoodAdmin}
        currentUserId={user.id}
        slug={slug}
      />
    </div>
  );
}
