"use client";

import { createContext, useContext, useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "./AuthProvider";
import { logger } from "@/lib/logger";
import { setSentryNeighborhood, addBreadcrumb } from "@/lib/sentry";

interface Neighborhood {
  id: string;
  name: string;
  slug: string;
}

interface NeighborhoodContextType {
  primaryNeighborhood: Neighborhood | null;
  neighborhoods: Neighborhood[];
  isAdmin: boolean;
  loading: boolean;
  switchNeighborhood: (neighborhoodId: string) => Promise<void>;
}

const NeighborhoodContext = createContext<NeighborhoodContextType>({
  primaryNeighborhood: null,
  neighborhoods: [],
  isAdmin: false,
  loading: true,
  switchNeighborhood: async () => {},
});

export function NeighborhoodProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [primaryNeighborhood, setPrimaryNeighborhood] = useState<Neighborhood | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!user) {
      setNeighborhoods([]);
      setPrimaryNeighborhood(null);
      setIsAdmin(false);
      setLoading(false);
      setSentryNeighborhood(null);
      return;
    }

    async function fetchNeighborhoodData() {
      setLoading(true);

      // Fetch user's profile with primary neighborhood
      const { data: profile } = await supabase
        .from("users")
        .select("primary_neighborhood_id")
        .eq("id", user!.id)
        .single();

      // Fetch user's active memberships with neighborhood data
      const { data: memberships, error } = await supabase
        .from("memberships")
        .select(`
          role,
          neighborhood:neighborhoods(id, name, slug)
        `)
        .eq("user_id", user!.id)
        .eq("status", "active")
        .is("deleted_at", null);

      if (error) {
        logger.error("Failed to fetch neighborhood data", error);
        setLoading(false);
        return;
      }

      // Extract neighborhoods from memberships
      const neighborhoodList: Neighborhood[] = (memberships || [])
        .filter((m) => m.neighborhood)
        .map((m) => m.neighborhood as unknown as Neighborhood);

      setNeighborhoods(neighborhoodList);

      // Determine primary neighborhood
      let primary: Neighborhood | null = null;
      if (profile?.primary_neighborhood_id) {
        primary = neighborhoodList.find((n) => n.id === profile.primary_neighborhood_id) || null;
      }
      // Fall back to first neighborhood if no primary set
      if (!primary && neighborhoodList.length > 0) {
        primary = neighborhoodList[0];
      }
      setPrimaryNeighborhood(primary);

      // Set Sentry neighborhood context
      setSentryNeighborhood(primary);

      // Check if user is admin in primary neighborhood
      if (primary) {
        const membership = memberships?.find(
          (m) => (m.neighborhood as unknown as Neighborhood).id === primary!.id
        );
        setIsAdmin(membership?.role === "admin");
      } else {
        setIsAdmin(false);
      }

      setLoading(false);
    }

    fetchNeighborhoodData();
  }, [user, supabase]);

  const switchNeighborhood = async (neighborhoodId: string) => {
    if (!user || neighborhoodId === primaryNeighborhood?.id) {
      return;
    }

    addBreadcrumb("Switching neighborhood", "action", {
      fromNeighborhoodId: primaryNeighborhood?.id,
      toNeighborhoodId: neighborhoodId,
    });

    const { error } = await supabase
      .from("users")
      .update({ primary_neighborhood_id: neighborhoodId })
      .eq("id", user.id);

    if (error) {
      logger.error("Failed to switch neighborhood", error);
      return;
    }

    // Hard refresh to reload server components with new data
    window.location.reload();
  };

  return (
    <NeighborhoodContext.Provider
      value={{
        primaryNeighborhood,
        neighborhoods,
        isAdmin,
        loading,
        switchNeighborhood,
      }}
    >
      {children}
    </NeighborhoodContext.Provider>
  );
}

export function useNeighborhood() {
  const context = useContext(NeighborhoodContext);
  if (context === undefined) {
    throw new Error("useNeighborhood must be used within a NeighborhoodProvider");
  }
  return context;
}
