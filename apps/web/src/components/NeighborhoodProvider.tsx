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

// Type for membership rows from Supabase query
// Supabase may return neighborhood as array or object depending on type inference
interface MembershipRow {
  role: string;
  neighborhood: Neighborhood | Neighborhood[] | null;
}

/**
 * Normalize membership row to extract neighborhood.
 * Supabase may return nested relations as arrays or objects.
 */
function normalizeNeighborhood(row: MembershipRow): { role: string; neighborhood: Neighborhood } | null {
  if (!row.neighborhood) return null;
  const neighborhood = Array.isArray(row.neighborhood) ? row.neighborhood[0] : row.neighborhood;
  if (!neighborhood) return null;
  return { role: row.role, neighborhood };
}

interface ImpersonationState {
  isImpersonating: boolean;
  impersonatedUserId: string | null;
  impersonatedUserName: string | null;
  impersonatedUserEmail: string | null;
  impersonatedUserAvatarUrl: string | null;
}

export interface InitialNeighborhoodData {
  primaryNeighborhoodId: string | null;
  neighborhoods: Neighborhood[];
  memberships: Array<{ role: string; neighborhood: Neighborhood }>;
  isStaffAdmin: boolean;
  userAvatarUrl: string | null;
}

interface NeighborhoodContextType {
  primaryNeighborhood: Neighborhood | null;
  neighborhoods: Neighborhood[];
  isAdmin: boolean;
  isStaffAdmin: boolean;
  isImpersonating: boolean;
  impersonatedUserName: string | null;
  impersonatedUserEmail: string | null;
  impersonatedUserAvatarUrl: string | null;
  userAvatarUrl: string | null;
  loading: boolean;
  switching: boolean;
  switchError: string | null;
  switchNeighborhood: (neighborhoodId: string) => Promise<void>;
}

const NeighborhoodContext = createContext<NeighborhoodContextType>({
  primaryNeighborhood: null,
  neighborhoods: [],
  isAdmin: false,
  isStaffAdmin: false,
  isImpersonating: false,
  impersonatedUserName: null,
  impersonatedUserEmail: null,
  impersonatedUserAvatarUrl: null,
  userAvatarUrl: null,
  loading: true,
  switching: false,
  switchError: null,
  switchNeighborhood: async () => {},
});

interface NeighborhoodProviderProps {
  children: React.ReactNode;
  impersonation?: ImpersonationState;
  initialData?: InitialNeighborhoodData;
}

export function NeighborhoodProvider({ children, impersonation, initialData }: NeighborhoodProviderProps) {
  const { user } = useAuth();
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [primaryNeighborhood, setPrimaryNeighborhood] = useState<Neighborhood | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStaffAdmin, setIsStaffAdmin] = useState(false);
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  // Determine which user ID to use for queries
  const effectiveUserId = impersonation?.isImpersonating
    ? impersonation.impersonatedUserId
    : user?.id;

  useEffect(() => {
    if (!user) {
      setNeighborhoods([]);
      setPrimaryNeighborhood(null);
      setIsAdmin(false);
      setIsStaffAdmin(false);
      setLoading(false);
      setSentryNeighborhood(null);
      return;
    }

    async function fetchNeighborhoodData() {
      setLoading(true);

      // If we have server-provided initial data (when impersonating), use that
      // This bypasses RLS issues where the browser client can't read impersonated user's data
      // and avoids a client-side fetch that can hang during SSR
      if (initialData) {
        setIsStaffAdmin(initialData.isStaffAdmin);
        setNeighborhoods(initialData.neighborhoods);
        setUserAvatarUrl(initialData.userAvatarUrl);

        // Determine primary neighborhood from initial data
        const primary = initialData.neighborhoods.find(
          (n) => n.id === initialData.primaryNeighborhoodId
        ) || initialData.neighborhoods[0] || null;
        setPrimaryNeighborhood(primary);

        // Set Sentry neighborhood context
        setSentryNeighborhood(primary);

        // Check if impersonated user is admin in primary neighborhood
        if (primary) {
          const membership = initialData.memberships.find(
            (m) => m.neighborhood?.id === primary!.id
          );
          setIsAdmin(membership?.role === "admin");
        } else {
          setIsAdmin(false);
        }

        setLoading(false);
        return;
      }

      // Fetch staff admin status (only when not using initialData)
      try {
        const staffResponse = await fetch("/api/auth/staff-status");
        const staffData = await staffResponse.json();
        setIsStaffAdmin(staffData.isStaffAdmin);
      } catch {
        setIsStaffAdmin(false);
      }

      // If staff admin and NOT impersonating, skip neighborhood fetching
      // Staff admins without impersonation don't have neighborhoods
      if (!effectiveUserId) {
        setNeighborhoods([]);
        setPrimaryNeighborhood(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      // Fetch user's profile with primary neighborhood and avatar
      const { data: profile } = await supabase
        .from("users")
        .select("primary_neighborhood_id, avatar_url")
        .eq("id", effectiveUserId)
        .single();

      setUserAvatarUrl(profile?.avatar_url ?? null);

      // Fetch user's active memberships with neighborhood data
      const { data: memberships, error } = await supabase
        .from("memberships")
        .select(`
          role,
          neighborhood:neighborhoods(id, name, slug)
        `)
        .eq("user_id", effectiveUserId)
        .eq("status", "active")
        .is("deleted_at", null);

      if (error) {
        logger.error("Failed to fetch neighborhood data", error);
        setLoading(false);
        return;
      }

      // Cast memberships and normalize neighborhood data (handle array/object variations)
      const allMemberships = (memberships || []) as MembershipRow[];
      const normalizedMemberships = allMemberships
        .map(normalizeNeighborhood)
        .filter((m): m is NonNullable<typeof m> => m !== null);
      const neighborhoodList = normalizedMemberships.map((m) => m.neighborhood);

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
        const membership = normalizedMemberships.find(
          (m) => m.neighborhood.id === primary!.id
        );
        setIsAdmin(membership?.role === "admin");
      } else {
        setIsAdmin(false);
      }

      setLoading(false);
    }

    fetchNeighborhoodData();
  }, [user, supabase, effectiveUserId, impersonation, initialData]);

  const switchNeighborhood = async (neighborhoodId: string) => {
    if (!user || neighborhoodId === primaryNeighborhood?.id) {
      return;
    }

    setSwitching(true);
    setSwitchError(null);

    addBreadcrumb("Switching neighborhood", "action", {
      fromNeighborhoodId: primaryNeighborhood?.id,
      toNeighborhoodId: neighborhoodId,
    });

    // Update the database and verify the change was applied
    const { error, data } = await supabase
      .from("users")
      .update({ primary_neighborhood_id: neighborhoodId })
      .eq("id", user.id)
      .select("primary_neighborhood_id")
      .single();

    if (error) {
      logger.error("Failed to switch neighborhood", error);
      setSwitchError("Failed to switch neighborhood. Please try again.");
      setSwitching(false);
      return;
    }

    // Verify the update was applied
    if (data?.primary_neighborhood_id !== neighborhoodId) {
      logger.error("Neighborhood switch verification failed", {
        expected: neighborhoodId,
        actual: data?.primary_neighborhood_id,
      });
      setSwitchError("Failed to switch neighborhood. Please try again.");
      setSwitching(false);
      return;
    }

    // Hard refresh to reload server components with new data
    window.location.reload();
  };

  // When impersonating, use impersonated user's avatar; otherwise use current user's avatar
  const effectiveAvatarUrl = impersonation?.isImpersonating
    ? impersonation.impersonatedUserAvatarUrl
    : userAvatarUrl;

  return (
    <NeighborhoodContext.Provider
      value={{
        primaryNeighborhood,
        neighborhoods,
        isAdmin,
        isStaffAdmin,
        isImpersonating: impersonation?.isImpersonating ?? false,
        impersonatedUserName: impersonation?.impersonatedUserName ?? null,
        impersonatedUserEmail: impersonation?.impersonatedUserEmail ?? null,
        impersonatedUserAvatarUrl: impersonation?.impersonatedUserAvatarUrl ?? null,
        userAvatarUrl: effectiveAvatarUrl,
        loading,
        switching,
        switchError,
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
