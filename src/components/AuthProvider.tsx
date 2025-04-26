import { createContext, useContext, useEffect, useState } from "react";
import { User } from "firebase/auth";
import { onAuthChange } from "@/integrations/firebase/client";

type AuthContextType = {
  user: User | null;
};

const AuthContext = createContext<AuthContextType>({ user: null });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Set up auth state listener
    const unsubscribe = onAuthChange((user) => {
      setUser(user);
    });

    // Clean up subscription
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  return useContext(AuthContext);
};

// Alias for useAuth to maintain backwards compatibility
export const useUser = useAuth;
