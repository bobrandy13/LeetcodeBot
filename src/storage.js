/**
 * Storage utilities for user data
 * Provides both KV storage (for production) and file storage (for development)
 */

/**
 * Get current date in Australian timezone (AEST/AEDT)
 * Returns a date string in YYYY-MM-DD format for consistent comparison
 */
export function getAustralianDate() {
  const date = new Date().toDateString("en-AU", {timeZone: "Australia/Sydney"});
  return date; 
}

/**
 * Get user data from storage
 */
export async function getUserData(env, userId) {
  console.log(`📥 [getUserData] Fetching data for userId: ${userId}`);
  try {
    // Try KV storage first (production)
    if (env.KV) {
      console.log(`  [getUserData] KV available, fetching from KV...`);
      const userData = await env.KV.get(userId);
      if (userData) {
        const parsed = JSON.parse(userData);
        console.log(`  [getUserData] ✅ Found user data:`, {
          username: parsed.username,
          completedCount: parsed.completedQuestions?.length || 0,
          streak: parsed.currentStreak,
          lastDate: parsed.lastCompletionDate
        });
        return parsed;
      }
      console.log(`  [getUserData] ⚠️ No data found for user, returning default`);
    } else {
      console.log(`  [getUserData] ⚠️ KV not available`);
    }

    // Fallback to default structure
    return {
      username: '',
      completedQuestions: [],
      currentStreak: 0,
      lastCompletionDate: null,
    };
  } catch (error) {
    console.error('❌ [getUserData] Error getting user data:', error);
    return {
      username: '',
      completedQuestions: [],
      currentStreak: 0,
      lastCompletionDate: null,
    };
  }
}

/**
 * Save user data to storage
 */
export async function saveUserData(env, userId, userData) {
  console.log(`💾 [saveUserData] Saving data for userId: ${userId}`);
  console.log(`  [saveUserData] Data:`, {
    username: userData.username,
    completedCount: userData.completedQuestions?.length || 0,
    streak: userData.currentStreak,
    lastDate: userData.lastCompletionDate
  });
  try {
    // Try KV storage (production)
    if (env.KV) {
      console.log(`  [saveUserData] Writing to KV...`);
      await env.KV.put(userId, JSON.stringify(userData));
      console.log(`  [saveUserData] ✅ Saved to KV successfully`);

      // Add user to master list
      console.log(`  [saveUserData] Adding user to master list...`);
      await addUserToList(env, userId);

      return true;
    }

    console.warn('⚠️ [saveUserData] KV storage not available - data not persisted');
    return true; // Return true for development to avoid errors
  } catch (error) {
    console.error('❌ [saveUserData] Error saving user data:', error);
    return false;
  }
}
 /**
//  * Normalize date to YYYY-MM-DD format regardless of input format
//  * Handles both old format ("Fri Dec 13 2025") and new format ("2025-12-13")
//  */
// function normalizeDate(dateString) {
//   if (!dateString) return null;
  
//   // If already in YYYY-MM-DD format, return as-is
//   if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
//     return dateString;
//   }
  
//   // Parse old format and convert to YYYY-MM-DD
//   const date = new Date(dateString);
//   if (isNaN(date.getTime())) {
//     console.error(`[normalizeDate] Invalid date string: ${dateString}`);
//     return null;
//   }
  
//   const year = date.getFullYear();
//   const month = String(date.getMonth() + 1).padStart(2, '0');
//   const day = String(date.getDate()).padStart(2, '0');
  
//   return `${year}-${month}-${day}`;
// }

/**
 * Update user streak based on completion timing
 */
export function updateStreak(userData) {
  const today = getAustralianDate();

  const lastDate = userData.lastCompletionDate;

  console.log(`[updateStreak] Today: ${today}, Last completion: ${lastDate}`);

  if (!lastDate) {
    // First completion
    console.log(`[updateStreak] First completion, setting streak to 1`);
    userData.currentStreak = 1;
  } else {
    // // Normalize the last completion date to YYYY-MM-DD format
    // const normalizedLastDate = normalizeDate(lastDate);

    // console.log(`[updateStreak] Normalized last date: ${normalizedLastDate}`);
    
    if (lastDate === today) {
      // Already completed today, don't update streak but ensure date format is consistent
      console.log(`[updateStreak] Already completed today, maintaining streak: ${userData.currentStreak}`);
      userData.lastCompletionDate = today; // Update to new format
      return userData;
    } else {
      // Calculate day difference using YYYY-MM-DD format with UTC to avoid timezone issues
      const lastDateObj = new Date(lastDate);
      const todayDateObj = new Date(today);
      const diffTime = todayDateObj - lastDateObj;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      console.log(`[updateStreak] Day difference: ${diffDays} (from ${lastDate} to ${today})`);

      if (diffDays === 1) {
        // Consecutive day
        userData.currentStreak += 1;
        console.log(`[updateStreak] Consecutive day! Streak increased to: ${userData.currentStreak}`);
      } else if (diffDays === 0) {
        // Same day (shouldn't happen due to check above, but handle it)
        console.log(`[updateStreak] Same day detected, maintaining streak: ${userData.currentStreak}`);
        return userData;
      } else if (diffDays < 0) {
        // Date is in the future? This shouldn't happen - maintain streak
        console.log(`[updateStreak] WARNING: Last completion date is in the future! Maintaining streak: ${userData.currentStreak}`);
        return userData;
      } else {
        // Streak broken (diffDays > 1)
        console.log(`[updateStreak] Streak broken (missed ${diffDays - 1} day(s)), resetting to 1`);
        userData.currentStreak = 1;
      }
    }
  }

  userData.lastCompletionDate = today;
  return userData;
}

/**
 * Format user data for file storage (username: question1, question2, etc.)
 */
export function formatUserDataForFile(userData) {
  return `${userData.username}: ${userData.completedQuestions.join(', ')} (Streak: ${userData.currentStreak})`;
}

/**
 * Get specific users' data by usernames (optimized for group streak)
 * This still needs to fetch all users to map usernames to IDs since we store by userId
 * But it fetches them in parallel which is much faster than sequential
 */
export async function getRequiredUsersData(env, requiredUsernames) {
  console.log(`👥 [getRequiredUsersData] Fetching data for required users:`, requiredUsernames);
  const startTime = Date.now();
  try {
    if (!env.KV) {
      console.log(`  [getRequiredUsersData] ⚠️ KV not available`);
      return [];
    }

    // Get list of all user IDs
    const userList = await env.KV.get('USER_LIST');
    if (!userList) {
      console.log(`  [getRequiredUsersData] ⚠️ No USER_LIST found`);
      return [];
    }

    const userIds = JSON.parse(userList);
    console.log(`  [getRequiredUsersData] Fetching ${userIds.length} users in parallel...`);
    
    // Fetch all users in parallel (much faster than sequential)
    const userDataPromises = userIds.map(userId => 
      getUserData(env, userId).then(data => ({ userId, ...data }))
    );
    const allUsers = await Promise.all(userDataPromises);
    
    // Filter to only required users
    const requiredUsers = allUsers.filter(user => 
      user.username && requiredUsernames.includes(user.username)
    );
    
    const elapsed = Date.now() - startTime;
    console.log(`  [getRequiredUsersData] ✅ Found ${requiredUsers.length}/${requiredUsernames.length} required users in ${elapsed}ms`);
    return requiredUsers;
  } catch (error) {
    console.error('❌ [getRequiredUsersData] Error getting required users data:', error);
    return [];
  }
}

/**
 * Get all users' data for group statistics
 */
export async function getAllUsersData(env) {
  console.log(`👥 [getAllUsersData] Fetching all users data...`);
  try {
    if (!env.KV) {
      console.log(`  [getAllUsersData] ⚠️ KV not available`);
      return [];
    }

    // Get list of all user IDs
    console.log(`  [getAllUsersData] Fetching USER_LIST from KV...`);
    const userList = await env.KV.get('USER_LIST');
    if (!userList) {
      console.log(`  [getAllUsersData] ⚠️ No USER_LIST found`);
      return [];
    }

    const userIds = JSON.parse(userList);
    console.log(`  [getAllUsersData] Found ${userIds.length} user IDs:`, userIds);
    
    // Fetch all users in parallel for better performance
    console.log(`  [getAllUsersData] Fetching all users in parallel...`);
    const userDataPromises = userIds.map(userId => getUserData(env, userId));
    const usersData = await Promise.all(userDataPromises);
    
    // Filter out users without username and combine with userId
    const allUsers = usersData
      .map((userData, index) => ({ userId: userIds[index], ...userData }))
      .filter(user => user.username);

    console.log(`  [getAllUsersData] ✅ Retrieved data for ${allUsers.length} users`);
    return allUsers;
  } catch (error) {
    console.error('❌ [getAllUsersData] Error getting all users data:', error);
    return [];
  }
}

/**
 * Add user to the master user list
 */
export async function addUserToList(env, userId) {
  console.log(`📝 [addUserToList] Adding userId to list: ${userId}`);
  try {
    if (!env.KV) {
      console.log(`  [addUserToList] ⚠️ KV not available`);
      return;
    }

    const userList = await env.KV.get('USER_LIST');
    let userIds = userList ? JSON.parse(userList) : [];
    console.log(`  [addUserToList] Current user list:`, userIds);

    if (!userIds.includes(userId)) {
      userIds.push(userId);
      await env.KV.put('USER_LIST', JSON.stringify(userIds));
      console.log(`  [addUserToList] ✅ Added user, new list:`, userIds);
    } else {
      console.log(`  [addUserToList] ℹ️ User already in list`);
    }
  } catch (error) {
    console.error('❌ [addUserToList] Error adding user to list:', error);
  }
}

/**
 * Get group streak data
 */
export async function getGroupStreak(env) {
  console.log(`🔥 [getGroupStreak] Fetching group streak data...`);
  try {
    if (!env.KV) {
      console.log(`  [getGroupStreak] ⚠️ KV not available`);
      return { streak: 0, lastDate: null, participatingUsers: [] };
    }

    const groupData = await env.KV.get('GROUP_STREAK');
    if (groupData) {
      const parsed = JSON.parse(groupData);
      console.log(`  [getGroupStreak] ✅ Found group streak data:`, parsed);
      return parsed;
    }

    console.log(`  [getGroupStreak] ⚠️ No group streak data found, returning default`);
    return {
      streak: 0,
      lastDate: null,
      participatingUsers: [],
    };
  } catch (error) {
    console.error('❌ [getGroupStreak] Error getting group streak:', error);
    return { streak: 0, lastDate: null, participatingUsers: [] };
  }
}

/**
 * Update group streak data - calculated as minimum personal streak of all 4 core members
 * @param {Object} currentUserData - Optional: pass the current user's fresh data to avoid refetching stale data
 */
export async function updateGroupStreak(env, currentUserData = null) {
  console.log(`🔥 [updateGroupStreak] Updating group streak...`);
  if (currentUserData) {
    console.log(`  [updateGroupStreak] Current user data provided:`, {
      username: currentUserData.username,
      userId: currentUserData.userId,
      streak: currentUserData.currentStreak,
      lastDate: currentUserData.lastCompletionDate
    });
  }
  try {
    if (!env.KV) {
      console.log(`  [updateGroupStreak] ⚠️ KV not available`);
      return { streak: 0, lastDate: null, participatingUsers: [] };
    }

    // Required usernames for group streak
    const REQUIRED_USERS = [
      'razar0200',
      'bobrandy',
      'esshaygod',
    ];
    console.log(`  [updateGroupStreak] Required users:`, REQUIRED_USERS);

    const today = getAustralianDate();
    console.log(`  [updateGroupStreak] Today's date:`, today);
    
    // Optimize: Only fetch the 4 required users instead of all users
    console.log(`  [updateGroupStreak] Fetching only required users...`);
    let requiredUsersData = await getRequiredUsersData(env, REQUIRED_USERS);
    
    // If we have fresh data for the current user, replace the stale KV data with it
    if (currentUserData && currentUserData.username && REQUIRED_USERS.includes(currentUserData.username)) {
      console.log(`  [updateGroupStreak] Replacing stale data for ${currentUserData.username} with fresh data`);
      const currentUserIndex = requiredUsersData.findIndex(u => u.username === currentUserData.username);
      if (currentUserIndex >= 0) {
        requiredUsersData[currentUserIndex] = currentUserData;
      } else {
        // User not found in list, add them
        requiredUsersData.push(currentUserData);
      }
    }
    
    console.log(`  [updateGroupStreak] Found ${requiredUsersData.length}/${REQUIRED_USERS.length} required users`);
    console.log(`  [updateGroupStreak] Required users data:`, requiredUsersData.map(u => ({
      username: u.username,
      streak: u.currentStreak,
      lastDate: u.lastCompletionDate
    })));

    // Find users who completed a question today from the required list
    const todayParticipants = requiredUsersData.filter(
      (user) => user.lastCompletionDate === today
    );
    console.log(`  [updateGroupStreak] Today's participants:`, todayParticipants.map(u => u.username));

    // Get which required users completed today
    const completedUsernames = todayParticipants.map((user) => user.username);

    // Get which required users haven't completed today
    const missingUsernames = REQUIRED_USERS.filter(
      (username) => !completedUsernames.includes(username)
    );
    console.log(`  [updateGroupStreak] Missing users:`, missingUsernames);

    // // For any required user who did NOT complete today, their personal streak should be reset to 0.
    // // Persist this change so future calculations (and `/stats`) reflect the break.
    // for (const user of requiredUsersData) {
    //   try {
    //     if (user.lastCompletionDate !== today) {
    //       if (user.currentStreak !== 0) {
    //         console.log(`  [updateGroupStreak] Resetting streak for ${user.username} (was ${user.currentStreak}) because they missed today`);
    //         user.currentStreak = 0;
    //         // Save updated user data back to KV
    //         await saveUserData(env, user.userId, {
    //           username: user.username || '',
    //           completedQuestions: user.completedQuestions || [],
    //           currentStreak: user.currentStreak,
    //           lastCompletionDate: user.lastCompletionDate || null,
    //         });
    //       }
    //     }
    //   } catch (err) {
    //     console.error(`  [updateGroupStreak] Error resetting streak for ${user.username}:`, err);
    //   }
    // }

    // Group streak logic: minimum of all individual streaks
    // This represents consecutive days where ALL users maintained their streaks
    let groupStreak = 0;
    if (requiredUsersData.length === REQUIRED_USERS.length) {
      const minIndividualStreak = Math.min(
        ...requiredUsersData.map((user) => user.currentStreak)
      );
      groupStreak = minIndividualStreak;
      console.log(`  [updateGroupStreak] Group streak (min of individual):`, groupStreak);
    } else {
      console.log(`  [updateGroupStreak] ⚠️ Not all required users found, group streak = 0`);
    }

    const updatedGroupData = {
      streak: groupStreak,
      lastDate: today,
      participatingUsers: completedUsernames,
      missingUsers: missingUsernames,
      requiredUsers: REQUIRED_USERS,
      allRequiredParticipated:
        todayParticipants.length === REQUIRED_USERS.length,
      individualStreaks: requiredUsersData.reduce((acc, user) => {
        acc[user.username] = user.currentStreak;
        return acc;
      }, {}),
    };

    console.log(`  [updateGroupStreak] Updated group data:`, updatedGroupData);
    console.log(`  [updateGroupStreak] Saving to KV...`);
    await env.KV.put('GROUP_STREAK', JSON.stringify(updatedGroupData));
    console.log(`  [updateGroupStreak] ✅ Saved successfully`);

    // Update group history
    console.log(`  [updateGroupStreak] Updating group history...`);
    await updateGroupHistory(env, updatedGroupData);

    return updatedGroupData;
  } catch (error) {
    console.error('❌ [updateGroupStreak] Error updating group streak:', error);
    return { streak: 0, lastDate: null, participatingUsers: [] };
  }
}

/**
 * Get group history and statistics
 */
export async function getGroupHistory(env) {
  console.log(`📜 [getGroupHistory] Fetching group history...`);
  try {
    if (!env.KV) {
      console.log(`  [getGroupHistory] ⚠️ KV not available`);
      return { maxStreak: 0, streakHistory: [], totalGroupDays: 0 };
    }

    const historyData = await env.KV.get('GROUP_HISTORY');
    if (historyData) {
      const parsed = JSON.parse(historyData);
      console.log(`  [getGroupHistory] ✅ Found history:`, {
        maxStreak: parsed.maxStreak,
        totalGroupDays: parsed.totalGroupDays,
        historyLength: parsed.streakHistory?.length || 0
      });
      return parsed;
    }

    console.log(`  [getGroupHistory] ⚠️ No history found, returning default`);
    return {
      maxStreak: 0,
      streakHistory: [],
      totalGroupDays: 0,
      firstGroupDay: null,
    };
  } catch (error) {
    console.error('❌ [getGroupHistory] Error getting group history:', error);
    return { maxStreak: 0, streakHistory: [], totalGroupDays: 0 };
  }
}

/**
 * Update group history when streak changes
 */
export async function updateGroupHistory(env, groupData) {
  console.log(`📝 [updateGroupHistory] Updating group history...`);
  try {
    if (!env.KV) {
      console.log(`  [updateGroupHistory] ⚠️ KV not available`);
      return;
    }

    const history = await getGroupHistory(env);
    console.log(`  [updateGroupHistory] Current history:`, {
      maxStreak: history.maxStreak,
      totalGroupDays: history.totalGroupDays
    });

    // Update max streak if current is higher
    if (groupData.streak > history.maxStreak) {
      console.log(`  [updateGroupHistory] 🎉 New max streak: ${groupData.streak} (previous: ${history.maxStreak})`);
      history.maxStreak = groupData.streak;
    }

    // Add to streak history if it's a new completion day
    if (groupData.allRequiredParticipated && groupData.lastDate) {
      const existingEntry = history.streakHistory.find(
        (entry) => entry.date === groupData.lastDate
      );
      if (!existingEntry) {
        console.log(`  [updateGroupHistory] ✅ Adding new entry for ${groupData.lastDate}`);
        history.streakHistory.push({
          date: groupData.lastDate,
          streak: groupData.streak,
          participants: groupData.participatingUsers,
        });
        history.totalGroupDays += 1;

        if (!history.firstGroupDay) {
          history.firstGroupDay = groupData.lastDate;
          console.log(`  [updateGroupHistory] 🎊 First group day recorded: ${history.firstGroupDay}`);
        }
      } else {
        console.log(`  [updateGroupHistory] ℹ️ Entry already exists for ${groupData.lastDate}`);
      }
    }

    // Keep only last 30 days of history to prevent excessive storage
    if (history.streakHistory.length > 30) {
      console.log(`  [updateGroupHistory] ✂️ Trimming history to last 30 days`);
      history.streakHistory = history.streakHistory.slice(-30);
    }

    console.log(`  [updateGroupHistory] Saving to KV...`);
    await env.KV.put('GROUP_HISTORY', JSON.stringify(history));
    console.log(`  [updateGroupHistory] ✅ Saved successfully`);
  } catch (error) {
    console.error('❌ [updateGroupHistory] Error updating group history:', error);
  }
}
