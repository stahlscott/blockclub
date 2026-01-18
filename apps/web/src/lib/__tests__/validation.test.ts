import { describe, it, expect } from 'vitest';
import { validateLength, MAX_LENGTHS } from '../validation';

describe('validation', () => {
  describe('validateLength', () => {
    it('returns null for valid length', () => {
      expect(validateLength('hello', 'Name', 10)).toBeNull();
    });

    it('returns null for exact max length', () => {
      expect(validateLength('hello', 'Name', 5)).toBeNull();
    });

    it('returns error message for exceeding length', () => {
      const result = validateLength('hello world', 'Name', 5);
      expect(result).toBe('Name must be 5 characters or less (currently 11)');
    });

    it('handles empty string', () => {
      expect(validateLength('', 'Name', 10)).toBeNull();
    });

    it('includes field name in error message', () => {
      const result = validateLength('too long', 'Bio', 5);
      expect(result).toContain('Bio');
    });

    it('includes current length in error message', () => {
      const result = validateLength('a'.repeat(150), 'Description', 100);
      expect(result).toContain('150');
    });
  });

  describe('MAX_LENGTHS', () => {
    it('has expected user field limits', () => {
      expect(MAX_LENGTHS.userName).toBe(100);
      expect(MAX_LENGTHS.userBio).toBe(500);
    });

    it('has expected neighborhood field limits', () => {
      expect(MAX_LENGTHS.neighborhoodName).toBe(100);
      expect(MAX_LENGTHS.neighborhoodDescription).toBe(500);
      expect(MAX_LENGTHS.neighborhoodLocation).toBe(200);
    });

    it('has expected item field limits', () => {
      expect(MAX_LENGTHS.itemName).toBe(100);
      expect(MAX_LENGTHS.itemDescription).toBe(1000);
    });

    it('has expected post field limits', () => {
      expect(MAX_LENGTHS.postContent).toBe(2000);
    });

    it('has expected general field limits', () => {
      expect(MAX_LENGTHS.address).toBe(200);
      expect(MAX_LENGTHS.phone).toBe(20);
      expect(MAX_LENGTHS.unit).toBe(20);
      expect(MAX_LENGTHS.children).toBe(500);
      expect(MAX_LENGTHS.pets).toBe(500);
    });
  });
});
