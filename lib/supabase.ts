import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug logs (visíveis no console do navegador F12)
if (typeof window !== 'undefined') {
  console.log('--- Supabase Debug ---');
  console.log('URL configurada:', supabaseUrl ? 'Sim (' + supabaseUrl.substring(0, 15) + '...)' : 'Não');
  console.log('Key configurada:', supabaseAnonKey ? 'Sim (Inicia com ' + supabaseAnonKey.substring(0, 5) + '...)' : 'Não');
  console.log('----------------------');
}

export const isSupabaseConfigured = !!(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('placeholder')
);

export const checkSupabaseConnection = async () => {
  if (!isSupabaseConfigured) return { ok: false, message: 'Supabase não configurado' };
  
  try {
    const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).limit(1);
    if (error) throw error;
    return { ok: true };
  } catch (err: any) {
    console.error('Erro de conexão Supabase:', err);
    return { ok: false, message: err.message };
  }
};

if (!isSupabaseConfigured && typeof window !== 'undefined') {
  console.warn('⚠️ Supabase não está configurado corretamente. Verifique as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);
