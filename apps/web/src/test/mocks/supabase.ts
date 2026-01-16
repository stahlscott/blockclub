import { vi } from 'vitest';
import type { User, Session } from '@supabase/supabase-js';

// Mock user factory
export const createMockUser = (overrides?: Partial<User>): User => ({
  id: 'test-user-id',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  ...overrides,
});

// Mock session factory
export const createMockSession = (user?: User): Session => ({
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Date.now() / 1000 + 3600,
  token_type: 'bearer',
  user: user || createMockUser(),
});

// Mock Supabase client
export const createMockSupabaseClient = () => {
  const mockAuth = {
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
    resend: vi.fn(),
  };

  const mockFrom = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  });

  return {
    auth: mockAuth,
    from: mockFrom,
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'mock-path' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'http://mock-url.com/image.jpg' } }),
        remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    },
  };
};

// Module mock for client-side Supabase
export const mockSupabaseClientModule = () => {
  vi.mock('@/lib/supabase/client', () => ({
    createClient: vi.fn(() => createMockSupabaseClient()),
  }));
};

// Module mock for server-side Supabase
export const mockSupabaseServerModule = () => {
  vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(async () => createMockSupabaseClient()),
  }));
};
