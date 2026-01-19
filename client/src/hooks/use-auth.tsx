import React, { createContext, useContext, useEffect, useState } from "react";
import { getUserFromToken, getAuthToken, type User, authApi } from "../lib/auth";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Disable profile query for now to fix loading issue
  // const { data: profileData } = useQuery({
  //   queryKey: ['/api/auth/me'],
  //   queryFn: authApi.getProfile,
  //   enabled: !!user && !!getAuthToken(),
  //   retry: false,
  // });

  useEffect(() => {
    const checkAuth = () => {
      try {
        const token = getAuthToken();
        if (token) {
          const tokenUser = getUserFromToken();
          if (tokenUser) {
            setUser(tokenUser);
            localStorage.setItem('userRole', tokenUser.role.toLowerCase());
          } else {
            // Token is invalid, clear it
            sessionStorage.removeItem('auth-token');
            localStorage.removeItem('auth-token');
            localStorage.removeItem('userRole');
            setUser(null);
          }
        } else {
          localStorage.removeItem('userRole');
          setUser(null);
        }
      } catch (error) {
        console.error('❌ Auth check error:', error);
        sessionStorage.removeItem('auth-token');
        localStorage.removeItem('auth-token');
        setUser(null);
      }
      setIsLoading(false);
    };
    
    checkAuth();

    // Listen for storage changes (when token is set in another tab/window via localStorage)
    // Note: sessionStorage changes don't trigger storage events between tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth-token') {
        // Only sync if localStorage changed (for backward compatibility)
        // sessionStorage is per-tab, so we don't need to sync it
        checkAuth();
      }
    };

    // Listen for custom token change events (works for both localStorage and sessionStorage)
    const handleTokenChange = () => {
      checkAuth();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('tokenChanged', handleTokenChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('tokenChanged', handleTokenChange);
    };
  }, []);

  const logout = () => {
    setUser(null);
    localStorage.removeItem('userRole');
    authApi.logout();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export { useAuth };
