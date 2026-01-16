import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isStaffAdmin } from '../auth';

// Mock the env module
vi.mock('../env', () => ({
  env: {
    STAFF_ADMIN_EMAILS: ['admin@blockclub.com', 'staff@blockclub.com'],
    SUPABASE_URL: 'http://localhost',
    SUPABASE_PUBLISHABLE_KEY: 'test-key',
  },
}));

describe('auth', () => {
  describe('isStaffAdmin', () => {
    it('returns true for staff admin email', () => {
      expect(isStaffAdmin('admin@blockclub.com')).toBe(true);
      expect(isStaffAdmin('staff@blockclub.com')).toBe(true);
    });

    it('returns false for non-admin email', () => {
      expect(isStaffAdmin('user@example.com')).toBe(false);
    });

    it('returns false for null email', () => {
      expect(isStaffAdmin(null)).toBe(false);
    });

    it('returns false for undefined email', () => {
      expect(isStaffAdmin(undefined)).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isStaffAdmin('')).toBe(false);
    });

    it('is case-sensitive', () => {
      expect(isStaffAdmin('ADMIN@blockclub.com')).toBe(false);
      expect(isStaffAdmin('Admin@Blockclub.Com')).toBe(false);
    });

    it('returns false for partial email match', () => {
      expect(isStaffAdmin('admin@blockclub.com.fake')).toBe(false);
      expect(isStaffAdmin('notadmin@blockclub.com')).toBe(false);
    });
  });
});
