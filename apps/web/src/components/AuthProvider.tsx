"use client";

import { createContext, useContext, useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { User, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { setSentryUser, addBreadcrumb } from "@/lib/sentry";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const initialLoadRef = useRef(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Set Sentry user context on initial load
      if (session?.user) {
        setSentryUser({
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.name,
        });
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Update Sentry user context on auth state change
      if (session?.user) {
        setSentryUser({
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.name,
        });
        addBreadcrumb("User signed in", "auth", { userId: session.user.id });
      } else {
        setSentryUser(null);
        addBreadcrumb("User signed out", "auth");
      }

      // Handle redirect after email confirmation (check before skipping initial load)
      if (event === "SIGNED_IN") {
        const storedRedirect = localStorage.getItem("authRedirect");
        if (storedRedirect) {
          localStorage.removeItem("authRedirect");
          router.push(storedRedirect);
          return;
        }
      }

      // Skip refresh on initial load - only refresh on actual auth changes
      if (initialLoadRef.current) {
        initialLoadRef.current = false;
        return;
      }

      // Refresh router to update server components when auth state changes
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
