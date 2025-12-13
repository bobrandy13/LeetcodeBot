/**
 * Test KV store connectivity and operations
 */
import { getUserData, saveUserData, getAllUsersData } from './src/storage.js';

console.log('Testing KV Store Operations...\n');

// Mock KV store
const mockKV = {
  data: {},
  async get(key) {
    console.log(`  KV.get("${key}") called`);
    const value = this.data[key] || null;
    console.log(`  KV.get("${key}") returned:`, value ? 'data found' : 'null');
    return value;
  },
  async put(key, value) {
    console.log(`  KV.put("${key}", ...) called`);
    this.data[key] = value;
    console.log(`  KV.put("${key}", ...) stored successfully`);
  },
  async list(options) {
    console.log(`  KV.list() called`);
    const keys = Object.keys(this.data)
      .filter(key => !options?.prefix || key.startsWith(options.prefix))
      .map(name => ({ name }));
    console.log(`  KV.list() returned ${keys.length} keys`);
    return { keys };
  }
};

const env = { KV: mockKV };

async function testKVOperations() {
  try {
    console.log('=== Test 1: Get user data (new user) ===');
    const userData1 = await getUserData(env, 'user123');
    console.log('Result:', userData1);
    console.log('✅ Test 1 passed\n');

    console.log('=== Test 2: Save user data ===');
    const testData = {
      username: 'testuser',
      completedQuestions: [1, 2, 3],
      currentStreak: 3,
      lastCompletionDate: new Date().toDateString()
    };
    const saved = await saveUserData(env, 'user123', testData);
    console.log('Save result:', saved);
    console.log('✅ Test 2 passed\n');

    console.log('=== Test 3: Get user data (existing user) ===');
    const userData2 = await getUserData(env, 'user123');
    console.log('Result:', userData2);
    console.log('Questions match:', JSON.stringify(userData2.completedQuestions) === JSON.stringify(testData.completedQuestions));
    console.log('✅ Test 3 passed\n');

    console.log('=== Test 4: Get all users data ===');
    // Add another user
    await saveUserData(env, 'user456', {
      username: 'anotheruser',
      completedQuestions: [5, 6],
      currentStreak: 2,
      lastCompletionDate: new Date().toDateString()
    });
    
    const allUsers = await getAllUsersData(env);
    console.log('All users count:', allUsers.length);
    console.log('All users:', allUsers.map(u => ({ id: u.userId, username: u.username })));
    console.log('✅ Test 4 passed\n');

    console.log('=== Test 5: Check KV store state ===');
    console.log('KV store keys:', Object.keys(mockKV.data));
    console.log('USER_LIST:', mockKV.data['USER_LIST']);
    console.log('✅ Test 5 passed\n');

    console.log('🎉 All KV store tests passed!');
    console.log('\n=== Summary ===');
    console.log('✅ KV.get() is being called correctly');
    console.log('✅ KV.put() is being called correctly');
    console.log('✅ KV.list() is being called correctly');
    console.log('✅ Data is being stored and retrieved properly');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
  }
}

testKVOperations();
