import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isSuperAdmin } from '../auth';

// Mock the env module
vi.mock('../env', () => ({
  env: {
    SUPER_ADMIN_EMAILS: ['admin@blockclub.com', 'super@blockclub.com'],
    SUPABASE_URL: 'http://localhost',
    SUPABASE_PUBLISHABLE_KEY: 'test-key',
  },
}));

describe('auth', () => {
  describe('isSuperAdmin', () => {
    it('returns true for super admin email', () => {
      expect(isSuperAdmin('admin@blockclub.com')).toBe(true);
      expect(isSuperAdmin('super@blockclub.com')).toBe(true);
    });

    it('returns false for non-admin email', () => {
      expect(isSuperAdmin('user@example.com')).toBe(false);
    });

    it('returns false for null email', () => {
      expect(isSuperAdmin(null)).toBe(false);
    });

    it('returns false for undefined email', () => {
      expect(isSuperAdmin(undefined)).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isSuperAdmin('')).toBe(false);
    });

    it('is case-sensitive', () => {
      expect(isSuperAdmin('ADMIN@blockclub.com')).toBe(false);
      expect(isSuperAdmin('Admin@Blockclub.Com')).toBe(false);
    });

    it('returns false for partial email match', () => {
      expect(isSuperAdmin('admin@blockclub.com.fake')).toBe(false);
      expect(isSuperAdmin('notadmin@blockclub.com')).toBe(false);
    });
  });
});
