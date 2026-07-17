import { supabase } from './supabase';
import type {
  Service,
  ServiceWithCounts,
  Token,
  TokenWithRelations,
  Profile,
} from './types';

/**
 * Build the username-as-email address used for Supabase Auth.
 * Usernames are lowercased and any '@' is stripped so the local-part is valid.
 */
export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase().replace(/@/g, '')}@q.local`;
}

export async function fetchServices(): Promise<ServiceWithCounts[]> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;

  // Fetch waiting counts and serving tokens in parallel for each service.
  const enriched = await Promise.all(
    (data as Service[]).map(async (s) => {
      const [waitingRes, servingRes] = await Promise.all([
        supabase
          .from('tokens')
          .select('id', { count: 'exact', head: true })
          .eq('service_id', s.id)
          .eq('status', 'waiting'),
        supabase
          .from('tokens')
          .select('*')
          .eq('service_id', s.id)
          .eq('status', 'serving')
          .maybeSingle(),
      ]);
      return {
        ...s,
        waiting_count: waitingRes.count ?? 0,
        serving_token: (servingRes.data as Token) ?? null,
      } as ServiceWithCounts;
    }),
  );
  return enriched;
}

export async function fetchService(id: string): Promise<Service | null> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as Service | null;
}

export async function fetchServiceTokens(serviceId: string): Promise<TokenWithRelations[]> {
  const { data, error } = await supabase
    .from('tokens')
    .select('*, service:services(*), profile:profiles!tokens_user_id_fkey(*)')
    .eq('service_id', serviceId)
    .in('status', ['waiting', 'serving'])
    .order('number', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as TokenWithRelations[];
}

export async function fetchMyTokens(): Promise<TokenWithRelations[]> {
  const { data, error } = await supabase
    .from('tokens')
    .select('*, service:services(*), profile:profiles!tokens_user_id_fkey(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as TokenWithRelations[];
}

export async function fetchAllTokens(): Promise<TokenWithRelations[]> {
  const { data, error } = await supabase
    .from('tokens')
    .select('*, service:services(*), profile:profiles!tokens_user_id_fkey(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as TokenWithRelations[];
}

export async function bookToken(serviceId: string): Promise<Token> {
  const { data, error } = await supabase.rpc('book_token', { p_service_id: serviceId });
  if (error) throw error;
  return data as unknown as Token;
}

export async function callNextToken(serviceId: string): Promise<Token | null> {
  const { data, error } = await supabase.rpc('call_next_token', { p_service_id: serviceId });
  if (error) throw error;
  return (data as unknown as Token) ?? null;
}

export async function updateTokenStatus(
  tokenId: string,
  status: Token['status'],
): Promise<void> {
  const patch: Partial<Token> = { status };
  if (status === 'completed') patch.completed_at = new Date().toISOString();
  if (status === 'cancelled') patch.completed_at = new Date().toISOString();
  const { error } = await supabase.from('tokens').update(patch).eq('id', tokenId);
  if (error) throw error;
}

export async function fetchProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function updateProfileRole(profileId: string, role: 'user' | 'admin'): Promise<void> {
  const { error } = await supabase.from('profiles').update({ role }).eq('id', profileId);
  if (error) throw error;
}

export async function createService(input: {
  name: string;
  description?: string;
  prefix: string;
  estimated_wait_minutes: number;
}): Promise<Service> {
  const { data, error } = await supabase
    .from('services')
    .insert({
      name: input.name,
      description: input.description ?? null,
      prefix: input.prefix.toUpperCase() || 'A',
      estimated_wait_minutes: Math.max(0, input.estimated_wait_minutes),
    })
    .select()
    .single();
  if (error) throw error;
  return data as Service;
}

export async function updateService(
  id: string,
  input: Partial<Pick<Service, 'name' | 'description' | 'prefix' | 'estimated_wait_minutes' | 'is_active'>>,
): Promise<void> {
  const patch: Record<string, unknown> = { ...input, updated_at: new Date().toISOString() };
  if (input.prefix) patch.prefix = input.prefix.toUpperCase();
  const { error } = await supabase.from('services').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteService(id: string): Promise<void> {
  const { error } = await supabase.from('services').delete().eq('id', id);
  if (error) throw error;
}
