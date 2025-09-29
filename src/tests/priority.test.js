import { PRIORITY, calculateRepoPriority } from '../../dist/helpers/fetchWithRateLimit.js';

describe('Priority System', () => {
  describe('PRIORITY constants', () => {
    test('should have correct priority hierarchy', () => {
      expect(PRIORITY.CRITICAL).toBeGreaterThan(PRIORITY.HIGH);
      expect(PRIORITY.HIGH).toBeGreaterThan(PRIORITY.MEDIUM);
      expect(PRIORITY.MEDIUM).toBeGreaterThan(PRIORITY.LOW);
      expect(PRIORITY.LOW).toBeGreaterThan(PRIORITY.RETRY);
      expect(PRIORITY.RETRY).toBeGreaterThan(PRIORITY.DEFAULT);
    });

    test('should have expected values', () => {
      expect(PRIORITY.CRITICAL).toBe(10);
      expect(PRIORITY.HIGH).toBe(8);
      expect(PRIORITY.MEDIUM).toBe(5);
      expect(PRIORITY.LOW).toBe(2);
      expect(PRIORITY.RETRY).toBe(1);
      expect(PRIORITY.DEFAULT).toBe(0);
    });
  });

  describe('calculateRepoPriority', () => {
    test('should return LOW priority for repo without updated_at', () => {
      const repo = { name: 'test-repo' };
      expect(calculateRepoPriority(repo)).toBe(PRIORITY.LOW);
    });

    test('should return HIGH priority for recently updated repo (< 30 days)', () => {
      const repo = {
        name: 'recent-repo',
        updated_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() // 15 days ago
      };
      expect(calculateRepoPriority(repo)).toBe(PRIORITY.HIGH);
    });

    test('should return MEDIUM priority for moderately recent repo (30-180 days)', () => {
      const repo = {
        name: 'medium-repo',
        updated_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days ago
      };
      expect(calculateRepoPriority(repo)).toBe(PRIORITY.MEDIUM);
    });

    test('should return LOW priority for old repo (> 180 days)', () => {
      const repo = {
        name: 'old-repo',
        updated_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year ago
      };
      expect(calculateRepoPriority(repo)).toBe(PRIORITY.LOW);
    });

    test('should handle edge cases correctly', () => {
      // Exactly 30 days ago (should be MEDIUM)
      const repo30Days = {
        name: 'edge-repo-30',
        updated_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      };
      expect(calculateRepoPriority(repo30Days)).toBe(PRIORITY.MEDIUM);

      // Exactly 180 days ago (should be LOW)
      const repo180Days = {
        name: 'edge-repo-180',
        updated_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()
      };
      expect(calculateRepoPriority(repo180Days)).toBe(PRIORITY.LOW);
    });
  });
});
