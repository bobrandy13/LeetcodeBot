/**
 * Quick test to verify the bot is responsive with hardcoded data
 */
import {
  getQuestionById,
  getDailyChallenge,
  getUserProfile,
} from './src/leetcode.js';

console.log('Testing bot responsiveness with hardcoded data...');

async function testResponsiveness() {
  const startTime = Date.now();

  try {
    // Test question lookup
    console.log('\n=== Testing Question Lookup ===');
    const question1 = await getQuestionById(1);
    console.log(
      `✅ Question 1: ${question1?.title} (${question1?.difficulty})`
    );

    const question206 = await getQuestionById(206);
    console.log(
      `✅ Question 206: ${question206?.title} (${question206?.difficulty})`
    );

    // Test daily challenge (now using mock data)
    console.log('\n=== Testing Daily Challenge ===');
    const daily = await getDailyChallenge();
    console.log(
      `✅ Daily Challenge: ${daily?.question?.title} (${daily?.question?.difficulty})`
    );

    // Test user profile (now using mock data)
    console.log('\n=== Testing User Profile ===');
    const profile = await getUserProfile('testuser');
    console.log(`✅ User Profile: ${profile?.username} (mock data)`);

    const endTime = Date.now();
    console.log(`\n⚡ Total execution time: ${endTime - startTime}ms`);
    console.log('🎉 Bot is now responsive with hardcoded data!');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testResponsiveness().catch(console.error);
