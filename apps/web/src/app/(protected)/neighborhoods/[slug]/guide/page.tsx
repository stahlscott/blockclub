import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getNeighborhoodAccess } from "@/lib/neighborhood-access";
import { getNeighborhoodGuideWithUpdatedBy } from "@/lib/queries";
import { GuideClient } from "./guide-client";
import styles from "./guide.module.css";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const { user, neighborhood, isNeighborhoodAdmin, supabase } =
    await getNeighborhoodAccess(slug);

  const { data: typedGuide } = await getNeighborhoodGuideWithUpdatedBy(
    supabase,
    neighborhood.id,
  );

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
