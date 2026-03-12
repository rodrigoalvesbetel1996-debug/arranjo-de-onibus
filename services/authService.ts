import { supabase } from '@/lib/supabase';

export const authService = {
  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async registerAdmin(name: string, email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role: 'admin',
        },
      },
    });
    if (error) throw error;
    return data;
  },

  async registerUser(name: string, email: string, password: string, accessCode: string) {
    // First, validate the access code via RPC before creating the user
    const { data: isValid, error: rpcError } = await supabase.rpc('check_access_code', {
      p_code: accessCode
    });

    if (rpcError) {
      console.error('RPC Error:', rpcError);
      throw new Error('Erro ao validar código de acesso.');
    }

    if (!isValid) {
      throw new Error('Código de congregação inválido ou expirado.');
    }

    // Sign up the user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role: 'user',
          accessCode,
        },
      },
    });

    if (error) throw error;

    return data;
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
};
