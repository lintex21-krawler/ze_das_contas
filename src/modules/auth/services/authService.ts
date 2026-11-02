import { supabase } from '@/infrastructure/supabase/client';
import type { User } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Family {
  id: string;
  name: string;
  currency_code: string;
  timezone: string;
  created_by: string;
  role?: 'admin' | 'member' | 'viewer';
}

export const authService = {
  async signUp(email: string, password: string, displayName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      },
    });

    if (error) throw error;
    return data;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser(): Promise<User | null> {
    const { data } = await supabase.auth.getUser();
    return data.user;
  },

  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.warn('Perfil não encontrado ou ainda não criado:', error.message);
      return null;
    }
    return data;
  },

  async getUserFamilies(): Promise<Family[]> {
    const { data, error } = await supabase
      .from('family_members')
      .select(`
        role,
        family:families (
          id,
          name,
          currency_code,
          timezone,
          created_by
        )
      `)
      .eq('status', 'active');

    if (error) {
      console.warn('Erro ao carregar famílias do usuário:', error.message);
      return [];
    }

    if (!data) return [];

    return data
      .map((item: any) => {
        if (!item.family) return null;
        return {
          ...item.family,
          role: item.role,
        };
      })
      .filter((f): f is Family => f !== null);
  },

  async createFamily(familyName: string, initialAccountName = 'Conta Corrente Principal') {
    const { data, error } = await supabase.rpc('create_family_with_admin', {
      p_family_name: familyName,
      p_initial_account_name: initialAccountName,
    });

    if (error) throw error;
    return data;
  },

  async inviteMember(familyId: string, email: string, role: 'member' | 'viewer' = 'member') {
    // Gera token de convite seguro
    const tokenBytes = crypto.getRandomValues(new Uint8Array(24));
    const token = Array.from(tokenBytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    
    // Hash SHA-256 do token para salvar no banco
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(token));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const tokenHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expira em 7 dias

    const { data, error } = await supabase.from('family_invitations').insert({
      family_id: familyId,
      email,
      token_hash: tokenHash,
      role,
      status: 'pending',
      expires_at: expiresAt.toISOString(),
      invited_by: (await supabase.auth.getUser()).data.user?.id,
    });

    if (error) throw error;
    return { token, expiresAt, data };
  },
};
