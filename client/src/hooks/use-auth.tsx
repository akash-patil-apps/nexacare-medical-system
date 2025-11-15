import { createContext, useContext, useEffect, useState } from "react";
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
        console.log('🔍 Auth check - token exists:', !!token);
        if (token) {
          const tokenUser = getUserFromToken();
          console.log('🔍 Auth check - decoded user:', tokenUser);
          if (tokenUser) {
            setUser(tokenUser);
            localStorage.setItem('userRole', tokenUser.role.toLowerCase());
            console.log('✅ User set in auth context');
          } else {
            // Token is invalid, clear it
            console.log('❌ Invalid token, clearing');
            localStorage.removeItem('auth-token');
            localStorage.removeItem('userRole');
            setUser(null);
          }
        } else {
          console.log('❌ No token found');
          localStorage.removeItem('userRole');
          setUser(null);
        }
      } catch (error) {
        console.error('❌ Auth check error:', error);
        localStorage.removeItem('auth-token');
        setUser(null);
      }
      setIsLoading(false);
    };
    
    checkAuth();

    // Listen for storage changes (when token is set in another tab/window)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth-token') {
        checkAuth();
      }
    };

    // Listen for custom token change events
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
export default useAuth;
