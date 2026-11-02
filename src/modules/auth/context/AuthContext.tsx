import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/infrastructure/supabase/client';
import { authService, Profile, Family } from '../services/authService';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  currentFamily: Family | null;
  families: Family[];
  isLoading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshFamilies: () => Promise<void>;
  setCurrentFamily: (family: Family) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SELECTED_FAMILY_KEY = 'ze_selected_family_id';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [families, setFamilies] = useState<Family[]>([]);
  const [currentFamily, setCurrentFamilyState] = useState<Family | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUserData = useCallback(async (activeUser: User) => {
    try {
      const [userProfile, userFamilies] = await Promise.all([
        authService.getProfile(activeUser.id),
        authService.getUserFamilies(),
      ]);

      setProfile(userProfile);
      setFamilies(userFamilies);

      // Restaura família selecionada ou seleciona a primeira disponível
      const savedFamilyId = localStorage.getItem(SELECTED_FAMILY_KEY);
      const matched = userFamilies.find((f) => f.id === savedFamilyId);
      const selected = matched || userFamilies[0] || null;

      setCurrentFamilyState(selected);
      if (selected) {
        localStorage.setItem(SELECTED_FAMILY_KEY, selected.id);
      }
    } catch (err) {
      console.error('Erro ao carregar dados do usuário:', err);
    }
  }, []);

  useEffect(() => {
    // Carrega sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      const activeUser = session?.user ?? null;
      setUser(activeUser);
      if (activeUser) {
        loadUserData(activeUser).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    // Escuta mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const activeUser = session?.user ?? null;
      setUser(activeUser);

      if (activeUser) {
        await loadUserData(activeUser);
      } else {
        setProfile(null);
        setFamilies([]);
        setCurrentFamilyState(null);
        localStorage.removeItem(SELECTED_FAMILY_KEY);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadUserData]);

  const signIn = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      await authService.signIn(email, pass);
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, pass: string, displayName: string) => {
    setIsLoading(true);
    try {
      await authService.signUp(email, pass, displayName);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await authService.signOut();
    } finally {
      setIsLoading(false);
    }
  };

  const refreshFamilies = async () => {
    if (!user) return;
    const userFamilies = await authService.getUserFamilies();
    setFamilies(userFamilies);
    if (!currentFamily && userFamilies.length > 0) {
      const first = userFamilies[0];
      if (first) {
        setCurrentFamilyState(first);
        localStorage.setItem(SELECTED_FAMILY_KEY, first.id);
      }
    }
  };

  const setCurrentFamily = (family: Family) => {
    localStorage.setItem(SELECTED_FAMILY_KEY, family.id);
    setCurrentFamilyState(family);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        currentFamily,
        families,
        isLoading,
        signIn,
        signUp,
        signOut,
        refreshFamilies,
        setCurrentFamily,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};
