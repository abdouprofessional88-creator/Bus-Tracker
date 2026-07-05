import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { auth as authApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const initialLoadDone = useRef(false);
  const skipNextLoad = useRef(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      initialLoadDone.current = true;
      return;
    }
    if (skipNextLoad.current) {
      skipNextLoad.current = false;
      initialLoadDone.current = true;
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const data = await authApi.getMe();
        setUser(data.user);
      } catch {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
        initialLoadDone.current = true;
      }
    })();
  }, [token]);

  const login = async (email, password) => {
    const data = await authApi.login(email, password);
    localStorage.setItem('token', data.token);
    skipNextLoad.current = true;
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const register = async (userData) => {
    const data = await authApi.register(userData);
    localStorage.setItem('token', data.token);
    skipNextLoad.current = true;
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updates) => {
    setUser(prev => ({ ...prev, ...updates }));
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      register,
      logout,
      updateUser,
      isAuthenticated: !!user,
      isDriver: user?.role === 'driver',
      isPassenger: user?.role === 'passenger',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
