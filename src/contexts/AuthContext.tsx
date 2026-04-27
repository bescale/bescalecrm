import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  full_name: string;
  company_id: string | null;
  avatar_url: string | null;
  phone: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  mustSetPassword: boolean;
  pendingPasswordReset: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearMustSetPassword: () => void;
  clearPendingPasswordReset: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PENDING_RESET_KEY = "pending_password_reset";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingPasswordReset, setPendingPasswordReset] = useState<boolean>(
    () => sessionStorage.getItem(PENDING_RESET_KEY) === "1",
  );

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, company_id, avatar_url, phone")
      .eq("id", userId)
      .single();
    setProfile(data);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const clearMustSetPassword = () => {
    setUser((u) =>
      u
        ? ({
            ...u,
            user_metadata: { ...u.user_metadata, must_set_password: false },
          } as User)
        : u,
    );
  };

  const clearPendingPasswordReset = () => {
    sessionStorage.removeItem(PENDING_RESET_KEY);
    setPendingPasswordReset(false);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Detecta o fluxo de reset de senha — o Supabase dispara esse evento
        // quando o link de recuperação é clicado. Marcamos para forçar redirect.
        if (event === "PASSWORD_RECOVERY") {
          sessionStorage.setItem(PENDING_RESET_KEY, "1");
          setPendingPasswordReset(true);
        }
        if (event === "SIGNED_OUT") {
          sessionStorage.removeItem(PENDING_RESET_KEY);
          setPendingPasswordReset(false);
        }

        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Use setTimeout to avoid Supabase auth deadlock
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    sessionStorage.removeItem(PENDING_RESET_KEY);
    setPendingPasswordReset(false);
  };

  const mustSetPassword = !!user?.user_metadata?.must_set_password;

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        mustSetPassword,
        pendingPasswordReset,
        signOut,
        refreshProfile,
        clearMustSetPassword,
        clearPendingPasswordReset,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
