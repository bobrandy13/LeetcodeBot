/**
 * Test script to verify the fetchAllProblems functionality
 */
import { getQuestionById, getDailyChallenge } from './src/leetcode.js';

console.log('Testing LeetCode API integration...');

// Test fetching a popular question
async function testQuestionFetch() {
  console.log('\n=== Testing Question Fetch ===');

  try {
    const question1 = await getQuestionById(1); // Two Sum
    if (question1) {
      console.log('✅ Successfully fetched question 1:');
      console.log(`   Title: ${question1.title}`);
      console.log(`   Difficulty: ${question1.difficulty}`);
      console.log(`   Slug: ${question1.titleSlug}`);
      console.log(`   Paid Only: ${question1.isPaidOnly}`);
    } else {
      console.log('❌ Failed to fetch question 1');
    }

    const question2 = await getQuestionById(2); // Add Two Numbers
    if (question2) {
      console.log('✅ Successfully fetched question 2:');
      console.log(`   Title: ${question2.title}`);
      console.log(`   Difficulty: ${question2.difficulty}`);
      console.log(`   Slug: ${question2.titleSlug}`);
    } else {
      console.log('❌ Failed to fetch question 2');
    }
  } catch (error) {
    console.error('❌ Error during question fetch test:', error.message);
  }
}

// Test fetching daily challenge
async function testDailyChallenge() {
  console.log('\n=== Testing Daily Challenge ===');

  try {
    const daily = await getDailyChallenge();
    if (daily && daily.question) {
      console.log('✅ Successfully fetched daily challenge:');
      console.log(`   Title: ${daily.question.title}`);
      console.log(`   Difficulty: ${daily.question.difficulty}`);
      console.log(`   Question ID: ${daily.question.frontendQuestionId}`);
      console.log(`   Date: ${daily.date}`);
    } else {
      console.log('❌ Failed to fetch daily challenge');
    }
  } catch (error) {
    console.error('❌ Error during daily challenge test:', error.message);
  }
}

// Run tests
async function runTests() {
  await testQuestionFetch();
  await testDailyChallenge();
  console.log('\n=== Test Complete ===');
}

runTests().catch(console.error);
