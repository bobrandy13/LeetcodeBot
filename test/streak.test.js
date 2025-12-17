/**
 * Test streak calculation with mocked dates
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { updateStreak } from '../src/storage.js';

describe('Streak Calculation Tests', () => {
  let originalDateTimeFormat;
  let mockCurrentDate;

  beforeEach(() => {
    // Save original Intl.DateTimeFormat
    originalDateTimeFormat = Intl.DateTimeFormat;
    
    // Mock Intl.DateTimeFormat to return our controlled date
    global.Intl.DateTimeFormat = function(locale, options) {
      if (options?.timeZone === 'Australia/Sydney') {
        return {
          formatToParts: () => {
            const [year, month, day] = mockCurrentDate.split('-');
            return [
              { type: 'year', value: year },
              { type: 'month', value: month },
              { type: 'day', value: day }
            ];
          }
        };
      }
      return new originalDateTimeFormat(locale, options);
    };
  });

  afterEach(() => {
    // Restore original Intl.DateTimeFormat
    global.Intl.DateTimeFormat = originalDateTimeFormat;
  });

  it('should set streak to 1 for first completion', () => {
    mockCurrentDate = '2025-12-14';
    
    const userData = {
      username: 'testuser',
      completedQuestions: [],
      currentStreak: 0,
      lastCompletionDate: null
    };

    const result = updateStreak(userData);
    
    assert.strictEqual(result.currentStreak, 1);
    assert.strictEqual(result.lastCompletionDate, '2025-12-14');
  });

  it('should increment streak for consecutive day', () => {
    mockCurrentDate = '2025-12-14';
    
    const userData = {
      username: 'testuser',
      completedQuestions: [1, 2],
      currentStreak: 5,
      lastCompletionDate: '2025-12-13'
    };

    const result = updateStreak(userData);
    
    assert.strictEqual(result.currentStreak, 6);
    assert.strictEqual(result.lastCompletionDate, '2025-12-14');
  });

  it('should maintain streak if already completed today', () => {
    mockCurrentDate = '2025-12-14';
    
    const userData = {
      username: 'testuser',
      completedQuestions: [1, 2, 3],
      currentStreak: 7,
      lastCompletionDate: '2025-12-14'
    };

    const result = updateStreak(userData);
    
    assert.strictEqual(result.currentStreak, 7);
    assert.strictEqual(result.lastCompletionDate, '2025-12-14');
  });

  it('should reset streak to 1 when missing one day', () => {
    mockCurrentDate = '2025-12-14';
    
    const userData = {
      username: 'testuser',
      completedQuestions: [1, 2],
      currentStreak: 10,
      lastCompletionDate: '2025-12-12' // Missed Dec 13
    };

    const result = updateStreak(userData);
    
    assert.strictEqual(result.currentStreak, 1);
    assert.strictEqual(result.lastCompletionDate, '2025-12-14');
  });

  it('should reset streak to 1 when missing multiple days', () => {
    mockCurrentDate = '2025-12-14';
    
    const userData = {
      username: 'testuser',
      completedQuestions: [1],
      currentStreak: 15,
      lastCompletionDate: '2025-12-10' // Missed 3 days
    };

    const result = updateStreak(userData);
    
    assert.strictEqual(result.currentStreak, 1);
    assert.strictEqual(result.lastCompletionDate, '2025-12-14');
  });

  it('should handle old date format (toDateString format)', () => {
    mockCurrentDate = '2025-12-14';
    
    const userData = {
      username: 'testuser',
      completedQuestions: [1, 2],
      currentStreak: 3,
      lastCompletionDate: 'Fri Dec 13 2025' // Old format
    };

    const result = updateStreak(userData);
    
    assert.strictEqual(result.currentStreak, 4);
    assert.strictEqual(result.lastCompletionDate, '2025-12-14');
  });

  it('should maintain streak with old format when already completed today', () => {
    mockCurrentDate = '2025-12-14';
    
    const userData = {
      username: 'testuser',
      completedQuestions: [1, 2, 3],
      currentStreak: 5,
      lastCompletionDate: 'Sat Dec 14 2025' // Old format, same day
    };

    const result = updateStreak(userData);
    
    assert.strictEqual(result.currentStreak, 5);
    assert.strictEqual(result.lastCompletionDate, '2025-12-14');
  });

  it('should reset streak with old format when missing days', () => {
    mockCurrentDate = '2025-12-14';
    
    const userData = {
      username: 'testuser',
      completedQuestions: [1],
      currentStreak: 8,
      lastCompletionDate: 'Wed Dec 11 2025' // Old format, missed 2 days
    };

    const result = updateStreak(userData);
    
    assert.strictEqual(result.currentStreak, 1);
    assert.strictEqual(result.lastCompletionDate, '2025-12-14');
  });

  it('should handle month boundary correctly', () => {
    mockCurrentDate = '2025-01-01';
    
    const userData = {
      username: 'testuser',
      completedQuestions: [1, 2],
      currentStreak: 20,
      lastCompletionDate: '2024-12-31'
    };

    const result = updateStreak(userData);
    
    assert.strictEqual(result.currentStreak, 21);
    assert.strictEqual(result.lastCompletionDate, '2025-01-01');
  });

  it('should handle year boundary correctly', () => {
    mockCurrentDate = '2026-01-01';
    
    const userData = {
      username: 'testuser',
      completedQuestions: [1, 2],
      currentStreak: 100,
      lastCompletionDate: '2025-12-31'
    };

    const result = updateStreak(userData);
    
    assert.strictEqual(result.currentStreak, 101);
    assert.strictEqual(result.lastCompletionDate, '2026-01-01');
  });

  it('should build up streak over consecutive days', () => {
    const userData = {
      username: 'testuser',
      completedQuestions: [],
      currentStreak: 0,
      lastCompletionDate: null
    };

    // Day 1
    mockCurrentDate = '2025-12-10';
    let result = updateStreak(userData);
    assert.strictEqual(result.currentStreak, 1);

    // Day 2
    mockCurrentDate = '2025-12-11';
    result = updateStreak(result);
    assert.strictEqual(result.currentStreak, 2);

    // Day 3
    mockCurrentDate = '2025-12-12';
    result = updateStreak(result);
    assert.strictEqual(result.currentStreak, 3);

    // Day 4
    mockCurrentDate = '2025-12-13';
    result = updateStreak(result);
    assert.strictEqual(result.currentStreak, 4);

    // Day 5
    mockCurrentDate = '2025-12-14';
    result = updateStreak(result);
    assert.strictEqual(result.currentStreak, 5);
  });

  it('should handle late night submission (11:52 PM scenario)', () => {
    // This simulates the original bug - someone submitting late at night
    mockCurrentDate = '2025-12-14';
    
    const userData = {
      username: 'razar',
      completedQuestions: [1, 2, 3],
      currentStreak: 5,
      lastCompletionDate: '2025-12-13'
    };

    const result = updateStreak(userData);
    
    // Should maintain consecutive streak, not reset
    assert.strictEqual(result.currentStreak, 6);
    assert.strictEqual(result.lastCompletionDate, '2025-12-14');
  });

  it('should handle invalid date format gracefully', () => {
    mockCurrentDate = '2025-12-14';
    
    const userData = {
      username: 'testuser',
      completedQuestions: [1],
      currentStreak: 5,
      lastCompletionDate: 'invalid-date-string'
    };

    const result = updateStreak(userData);
    
    // Should reset streak when date is invalid
    assert.strictEqual(result.currentStreak, 1);
    assert.strictEqual(result.lastCompletionDate, '2025-12-14');
  });
});
