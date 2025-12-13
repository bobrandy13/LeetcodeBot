import { expect } from 'chai';
import { describe, it } from 'mocha';
import {
  updateStreak,
  formatUserDataForFile,
  getAustralianDate,
} from '../src/storage.js';

describe('Storage Utilities', () => {
  describe('updateStreak', () => {
    it('should set streak to 1 for first completion', () => {
      const userData = {
        username: 'testuser',
        completedQuestions: [],
        currentStreak: 0,
        lastCompletionDate: null,
      };

      const result = updateStreak(userData);

      expect(result.currentStreak).to.equal(1);
      expect(result.lastCompletionDate).to.equal(new Date().toDateString());
    });

    it('should not change streak for same day completion', () => {
      const today = new Date().toDateString();
      const userData = {
        username: 'testuser',
        completedQuestions: [1234],
        currentStreak: 3,
        lastCompletionDate: today,
      };

      const result = updateStreak(userData);

      expect(result.currentStreak).to.equal(3);
      expect(result.lastCompletionDate).to.equal(today);
    });

    it('should increment streak for consecutive day', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const userData = {
        username: 'testuser',
        completedQuestions: [1234],
        currentStreak: 2,
        lastCompletionDate: yesterday.toDateString(),
      };

      const result = updateStreak(userData);

      expect(result.currentStreak).to.equal(3);
      expect(result.lastCompletionDate).to.equal(new Date().toDateString());
    });

    it('should reset streak for non-consecutive day', () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const userData = {
        username: 'testuser',
        completedQuestions: [1234],
        currentStreak: 5,
        lastCompletionDate: threeDaysAgo.toDateString(),
      };

      const result = updateStreak(userData);

      expect(result.currentStreak).to.equal(1);
      expect(result.lastCompletionDate).to.equal(new Date().toDateString());
    });
  });

  describe('formatUserDataForFile', () => {
    it('should format user data correctly', () => {
      const userData = {
        username: 'Bobrandy',
        completedQuestions: [1241, 12512],
        currentStreak: 3,
        lastCompletionDate: '2025-08-26',
      };

      const result = formatUserDataForFile(userData);

      expect(result).to.equal('Bobrandy: 1241, 12512 (Streak: 3)');
    });

    it('should handle empty questions list', () => {
      const userData = {
        username: 'NewUser',
        completedQuestions: [],
        currentStreak: 0,
        lastCompletionDate: null,
      };

      const result = formatUserDataForFile(userData);

      expect(result).to.equal('NewUser:  (Streak: 0)');
    });
  });

  describe('getAustralianDate', () => {
    it('should return a date string in Australian timezone', () => {
      const result = getAustralianDate();

      // Should be a valid date string
      expect(result).to.be.a('string');
      expect(new Date(result)).to.not.be.NaN;

      // Should match the expected format (like "Mon Aug 26 2025")
      expect(result).to.match(/^[A-Za-z]{3} [A-Za-z]{3} \d{2} \d{4}$/);
    });
  });
});
