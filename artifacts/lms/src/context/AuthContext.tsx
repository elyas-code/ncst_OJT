import React, { createContext, useContext, useState, useEffect } from "react";
import { useGetMe, User } from "@workspace/api-client-react";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  setUser: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isInit, setIsInit] = useState(false);
  
  const { data: me, isLoading, isError } = useGetMe({
    query: {
      retry: false,
    } as any
  });

  useEffect(() => {
    if (!isLoading) {
      if (me && !isError) {
        setUser(me);
      } else {
        setUser(null);
      }
      setIsInit(true);
    }
  }, [me, isLoading, isError]);

  return (
    <AuthContext.Provider value={{ user, isLoading: !isInit, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
