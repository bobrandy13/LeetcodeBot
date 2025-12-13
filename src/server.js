/**
 * The core server that runs on a Cloudflare worker.
 */

import { AutoRouter } from 'itty-router';
import {
  InteractionResponseType,
  InteractionType,
  verifyKey,
} from 'discord-interactions';
import {
  AWW_COMMAND,
  INVITE_COMMAND,
  QUESTION_COMPLETE,
  STATS_COMMAND,
  GROUP_STATS_COMMAND,
  GROUP_STREAK_COMMAND,
  PLAYER_STATS_COMMAND,
  GROUP_HISTORY_COMMAND,
  QUESTION_INFO_COMMAND,
  LEETCODE_PROFILE_COMMAND,
  DAILY_CHALLENGE_COMMAND,
} from './commands.js';
import { getCuteUrl } from './reddit.js';
import { InteractionResponseFlags } from 'discord-interactions';
import {
  getUserData,
  saveUserData,
  updateStreak,
  getAllUsersData,
  updateGroupStreak,
  getAustralianDate,
  getGroupHistory,
} from './storage.js';
import {
  getQuestionById,
  getQuestionBySlug,
  getUserProfile,
  getUserProblemStats,
  getUserRecentSubmissions,
  getDailyChallenge,
  getUserContestRanking,
  formatDifficulty,
  formatTimestamp,
} from './leetcode.js';

class JsonResponse extends Response {
  constructor(body, init) {
    const jsonBody = JSON.stringify(body);
    init = init || {
      headers: {
        'content-type': 'application/json;charset=UTF-8',
      },
    };
    super(jsonBody, init);
  }
}

const router = AutoRouter();

/**
 * A simple :wave: hello page to verify the worker is working.
 */
router.get('/', (request, env) => {
  return new Response(`👋 ${env.DISCORD_APPLICATION_ID}`);
});

/**
 * Debug endpoint to test KV connectivity
 */
router.get('/test-kv', async (request, env) => {
  try {
    const results = {
      kvExists: !!env.KV,
      timestamp: new Date().toISOString(),
    };

    if (env.KV) {
      // Test write
      await env.KV.put('test_key', 'test_value');
      results.writeTest = 'success';

      // Test read
      const value = await env.KV.get('test_key');
      results.readTest = value === 'test_value' ? 'success' : 'failed';

      // Get user list
      const userList = await env.KV.get('USER_LIST');
      results.userListExists = !!userList;
      results.userCount = userList ? JSON.parse(userList).length : 0;

      // List all keys
      const list = await env.KV.list();
      results.totalKeys = list.keys.length;
      results.allKeys = list.keys.map(k => k.name);

      // Get sample user data
      if (userList) {
        const users = JSON.parse(userList);
        if (users.length > 0) {
          const sampleUserId = users[0];
          const sampleUserData = await env.KV.get(sampleUserId);
          results.sampleUser = {
            id: sampleUserId,
            data: sampleUserData ? JSON.parse(sampleUserData) : null
          };
        }
      }

      // Get group data
      const groupData = await env.KV.get('GROUP_STREAK');
      results.groupData = groupData ? JSON.parse(groupData) : null;
    }

    return new Response(JSON.stringify(results, null, 2), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }, null, 2),
      {
        status: 500,
        headers: { 'content-type': 'application/json' },
      }
    );
  }
});

/**
 * Main route for all requests sent from Discord.  All incoming messages will
 * include a JSON payload described here:
 * https://discord.com/developers/docs/interactions/receiving-and-responding#interaction-object
 */
router.post('/', async (request, env) => {
  console.log('=== POST / endpoint called ===');
  console.log('Request URL:', request.url);
  console.log('Request method:', request.method);
  console.log('Env keys:', Object.keys(env));
  console.log('KV exists:', !!env.KV);
  
  console.log('Verifying Discord request...');
  const { isValid, interaction } = await server.verifyDiscordRequest(
    request,
    env
  );
  console.log('Verification complete - isValid:', isValid, 'interaction exists:', !!interaction);
  
  if (!isValid || !interaction) {
    console.log('❌ Invalid request or no interaction - returning 401');
    return new Response('Bad request signature.', { status: 401 });
  }

  console.log('Interaction type:', interaction.type);
  
  if (interaction.type === InteractionType.PING) {
    console.log('🏓 PING interaction - responding with PONG');
    // The `PING` message is used during the initial webhook handshake, and is
    // required to configure the webhook in the developer portal.
    return new JsonResponse({
      type: InteractionResponseType.PONG,
    });
  }


  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    console.log('📝 APPLICATION_COMMAND received');
    console.log('Command name:', interaction.data?.name);
    console.log('📝 APPLICATION_COMMAND received');
    console.log('Command name:', interaction.data?.name);
    // Most user commands will come as `APPLICATION_COMMAND`.
    switch (interaction.data.name.toLowerCase()) {
      case QUESTION_COMPLETE.name.toLowerCase(): {
        console.log('🎯 Processing QUESTION_COMPLETE command');
        const startTime = Date.now();
        const userId = interaction.member?.user?.id || interaction.user?.id;
        const username =
          interaction.member?.user?.username || interaction.user?.username;
        const questionId = interaction.data.options?.[0]?.value;

        console.log('User ID:', userId);
        console.log('Username:', username);
        console.log('Question ID:', questionId);

        if (!userId || !username) {
          console.log('❌ Missing user identification');
          return new JsonResponse({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: 'Error: Could not identify user.',
              flags: InteractionResponseFlags.EPHEMERAL,
            },
          });
        }

        if (!questionId) {
          console.log('❌ Missing question ID');
          return new JsonResponse({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: 'Error: Please provide a question ID.',
              flags: InteractionResponseFlags.EPHEMERAL,
            },
          });
        }

        // Get existing user data
        console.log('📥 Fetching user data from KV...');
        const t1 = Date.now();
        let userData = await getUserData(env, userId);
        console.log(`  ⏱️ getUserData took ${Date.now() - t1}ms`);
        console.log('User data retrieved:', {
          completedCount: userData.completedQuestions.length,
          streak: userData.currentStreak,
          lastDate: userData.lastCompletionDate
        });
        userData.username = username;

        // Check if question already completed
        if (userData.completedQuestions.includes(questionId)) {
          console.log('⚠️ Question already completed by user');
          return new JsonResponse({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `You've already completed question ${questionId}! 🎯`,
              flags: InteractionResponseFlags.EPHEMERAL,
            },
          });
        }

        // Add question to completed list
        console.log('➕ Adding question to completed list');
        userData.completedQuestions.push(questionId);

        // Update streak
        console.log('📊 Updating streak...');
        userData = updateStreak(userData);
        console.log('Streak updated:', userData.currentStreak);

        // Save updated data
        console.log('💾 Saving user data to KV...');
        const t2 = Date.now();
        const saved = await saveUserData(env, userId, userData);
        console.log(`  ⏱️ saveUserData took ${Date.now() - t2}ms`);
        console.log('Save result:', saved);

        if (!saved) {
          console.log('❌ Failed to save user data');
          return new JsonResponse({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: 'Error: Could not save completion data.',
              flags: InteractionResponseFlags.EPHEMERAL,
            },
          });
        }

        // Update group streak - pass the fresh user data to avoid KV staleness
        console.log('👥 Updating group streak...');
        const t3 = Date.now();
        const groupData = await updateGroupStreak(env, { userId, ...userData });
        console.log(`  ⏱️ updateGroupStreak took ${Date.now() - t3}ms`);
        console.log('Group data:', groupData);

        // Try to fetch question details from LeetCode API
        console.log('🔍 Fetching question details...');
        let questionTitle = `Question ${questionId}`;
        let questionDetails = '';
        try {
          const question =
            (await getQuestionById(questionId)) ||
            (await getQuestionBySlug(questionId.toString()));
          if (question) {
            console.log('✅ Question found:', question.title);
            questionTitle = `${question.questionFrontendId}. ${question.title}`;
            questionDetails = ` (${formatDifficulty(question.difficulty)})`;
          } else {
            console.log('⚠️ Question not found in database');
          }
        } catch (error) {
          console.warn('❌ Could not fetch question details:', error);
          // Continue without question details
        }

        // Create response message
        console.log('📤 Creating response message...');
        const streakEmoji =
          userData.currentStreak >= 7
            ? '🔥'
            : userData.currentStreak >= 3
              ? '⚡'
              : '✅';

        let response =
          `🎉 Great job, ${username}! You completed **${questionTitle}**${questionDetails}!\n` +
          `${streakEmoji} Current streak: ${userData.currentStreak} day${userData.currentStreak !== 1 ? 's' : ''}\n` +
          `📊 Total completed: ${userData.completedQuestions.length} question${userData.completedQuestions.length !== 1 ? 's' : ''}`;

        // Add group streak info if applicable
        if (groupData.streak > 0) {
          const groupEmoji =
            groupData.streak >= 7
              ? '🔥🔥'
              : groupData.streak >= 3
                ? '⚡⚡'
                : '🏆';
          response += `\n${groupEmoji} Group streak: ${groupData.streak} day${groupData.streak !== 1 ? 's' : ''}!`;
        }

        console.log('✅ Returning success response');
        console.log(`⏱️ Total QUESTION_COMPLETE processing time: ${Date.now() - startTime}ms`);
        return new JsonResponse({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: response,
          },
        });
      }
      case STATS_COMMAND.name.toLowerCase(): {
        console.log('📊 Processing STATS_COMMAND');
        const userId = interaction.member?.user?.id || interaction.user?.id;
        const username =
          interaction.member?.user?.username || interaction.user?.username;

        console.log('Stats request for - User ID:', userId, 'Username:', username);

        if (!userId || !username) {
          console.log('❌ Missing user identification for stats');
          return new JsonResponse({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: 'Error: Could not identify user.',
              flags: InteractionResponseFlags.EPHEMERAL,
            },
          });
        }

        // Get user data
        console.log('📥 Fetching user data for stats...');
        const userData = await getUserData(env, userId);
        console.log('Stats data retrieved:', {
          completedCount: userData.completedQuestions.length,
          streak: userData.currentStreak
        });

        if (userData.completedQuestions.length === 0) {
          console.log('⚠️ User has no completed questions');
          return new JsonResponse({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `${username}, you haven't completed any questions yet! Use \`/complete <question_id>\` to track your progress. 🚀`,
              flags: InteractionResponseFlags.EPHEMERAL,
            },
          });
        }

        // Format completed questions for display
        console.log('📋 Formatting stats response...');
        const recentQuestions = userData.completedQuestions
          .slice(-10)
          .join(', ');
        const streakEmoji =
          userData.currentStreak >= 7
            ? '🔥'
            : userData.currentStreak >= 3
              ? '⚡'
              : '✅';

        const response =
          `📊 **${username}'s Statistics**\n\n` +
          `${streakEmoji} Current streak: **${userData.currentStreak}** day${userData.currentStreak !== 1 ? 's' : ''}\n` +
          `🎯 Total completed: **${userData.completedQuestions.length}** question${userData.completedQuestions.length !== 1 ? 's' : ''}\n` +
          `📅 Last completion: ${userData.lastCompletionDate || 'Never'}\n\n` +
          `🔢 Recent questions: ${recentQuestions}${userData.completedQuestions.length > 10 ? '...' : ''}`;

        console.log('✅ Returning stats response');
        return new JsonResponse({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: response,
            flags: InteractionResponseFlags.EPHEMERAL,
          },
        });
      }
      case GROUP_STATS_COMMAND.name.toLowerCase(): {
        console.log('👥 Processing GROUP_STATS_COMMAND');
        // Get all users' data
        console.log('📥 Fetching all users data...');
        const allUsers = await getAllUsersData(env);
        console.log('Retrieved', allUsers.length, 'users');

        if (allUsers.length === 0) {
          console.log('⚠️ No users found');
          return new JsonResponse({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content:
                'No users have completed any questions yet! Be the first to use `/complete <question_id>` 🚀',
            },
          });
        }

        // Sort users by total completed questions (descending)
        console.log('📊 Sorting users by completion count...');
        allUsers.sort(
          (a, b) => b.completedQuestions.length - a.completedQuestions.length
        );

        // Create leaderboard
        console.log('🏆 Creating leaderboard...');
        let response = '🏆 **Group Statistics**\n\n';

        allUsers.forEach((user, index) => {
          const medal =
            index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📍';
          const streakEmoji =
            user.currentStreak >= 7
              ? '🔥'
              : user.currentStreak >= 3
                ? '⚡'
                : '✅';

          response += `${medal} **${user.username}**\n`;
          response += `   ${streakEmoji} Streak: ${user.currentStreak} day${user.currentStreak !== 1 ? 's' : ''} | `;
          response += `🎯 Total: ${user.completedQuestions.length} question${user.completedQuestions.length !== 1 ? 's' : ''}\n\n`;
        });

        // Add summary stats
        const totalQuestions = allUsers.reduce(
          (sum, user) => sum + user.completedQuestions.length,
          0
        );
        const avgQuestions =
          Math.round((totalQuestions / allUsers.length) * 10) / 10;
        const activeToday = allUsers.filter(
          (user) => user.lastCompletionDate === getAustralianDate()
        ).length;

        response += `📈 **Summary**\n`;
        response += `👥 Active users: ${allUsers.length}\n`;
        response += `📊 Total questions completed: ${totalQuestions}\n`;
        response += `📉 Average per user: ${avgQuestions}\n`;
        response += `🗓️ Active today: ${activeToday}/${allUsers.length}`;

        return new JsonResponse({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: response,
          },
        });
      }
      case GROUP_STREAK_COMMAND.name.toLowerCase(): {
        console.log('🔥 Processing GROUP_STREAK_COMMAND');
        console.log('📥 Fetching group streak data...');
        const groupData = await updateGroupStreak(env);
        console.log('Group streak:', groupData.streak, 'All participated:', groupData.allRequiredParticipated);
        const today = getAustralianDate();

        const streakEmoji =
          groupData.streak >= 7
            ? '🔥🔥'
            : groupData.streak >= 3
              ? '⚡⚡'
              : '🏆';

        let response = `${streakEmoji} **Group Daily Streak: ${groupData.streak}** day${groupData.streak !== 1 ? 's' : ''}\n\n`;

        response += `🎯 **Required Members:** razar0200, icdumplingman, drag0n0, esshaygod\n`;
        response += `📅 **Today (${today}):**\n\n`;

        if (groupData.allRequiredParticipated) {
          response += `🎉 **ALL 4 MEMBERS COMPLETED TODAY!** ✅\n`;
          response += `👥 **Completed:** ${groupData.participatingUsers.join(', ')}\n\n`;
          if (groupData.streak === 1) {
            response += `🚀 Group streak started! Keep it going tomorrow!`;
          } else {
            response += `🔥 Keep the streak alive! Everyone complete tomorrow too!`;
          }
        } else {
          const completedCount = groupData.participatingUsers.length;
          response += `⚠️ **${completedCount}/4 members completed today**\n\n`;

          if (groupData.participatingUsers.length > 0) {
            response += `✅ **Completed today:** ${groupData.participatingUsers.join(', ')}\n`;
          }

          if (groupData.missingUsers.length > 0) {
            response += `❌ **Still needed:** ${groupData.missingUsers.join(', ')}\n\n`;
          }

          if (groupData.streak > 0) {
            response += `💔 Streak will be broken unless everyone completes today!\n`;
            response += `💪 **${groupData.missingUsers.join(', ')}** - complete a question to save the streak!`;
          } else {
            response += `� **All 4 members** need to complete a question on the same day to start the group streak!`;
          }
        }

        console.log('✅ Returning group streak response');
        return new JsonResponse({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: response,
          },
        });
      }
      case PLAYER_STATS_COMMAND.name.toLowerCase(): {
        console.log('👤 Processing PLAYER_STATS_COMMAND');
        const requestedUsername = interaction.data.options?.[0]?.value;
        console.log('Requested username:', requestedUsername);

        if (!requestedUsername) {
          console.log('❌ No username provided');
          return new JsonResponse({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: 'Error: Please specify a username.',
              flags: InteractionResponseFlags.EPHEMERAL,
            },
          });
        }

        // Get all users and find the requested one
        const allUsers = await getAllUsersData(env);
        const targetUser = allUsers.find(
          (user) => user.username === requestedUsername
        );

        if (!targetUser || targetUser.completedQuestions.length === 0) {
          return new JsonResponse({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `${requestedUsername} hasn't completed any questions yet! 🚀`,
              flags: InteractionResponseFlags.EPHEMERAL,
            },
          });
        }

        // Format user stats
        const streakEmoji =
          targetUser.currentStreak >= 7
            ? '🔥'
            : targetUser.currentStreak >= 3
              ? '⚡'
              : '✅';
        const recentQuestions = targetUser.completedQuestions
          .slice(-10)
          .join(', ');

        // Calculate rank among all users
        const sortedUsers = allUsers.sort(
          (a, b) => b.completedQuestions.length - a.completedQuestions.length
        );
        const rank =
          sortedUsers.findIndex((user) => user.username === requestedUsername) +
          1;
        const rankEmoji =
          rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '📍';

        const response =
          `${rankEmoji} **${targetUser.username}'s Statistics** (Rank #${rank})\n\n` +
          `${streakEmoji} Current streak: **${targetUser.currentStreak}** day${targetUser.currentStreak !== 1 ? 's' : ''}\n` +
          `🎯 Total completed: **${targetUser.completedQuestions.length}** question${targetUser.completedQuestions.length !== 1 ? 's' : ''}\n` +
          `📅 Last completion: ${targetUser.lastCompletionDate || 'Never'}\n\n` +
          `🔢 Recent questions: ${recentQuestions}${targetUser.completedQuestions.length > 10 ? '...' : ''}`;

        return new JsonResponse({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: response,
          },
        });
      }
      case GROUP_HISTORY_COMMAND.name.toLowerCase(): {
        const history = await getGroupHistory(env);
        const groupData = await updateGroupStreak(env);

        if (history.totalGroupDays === 0) {
          return new JsonResponse({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content:
                'No group history yet! Complete some questions together to build your legacy 🚀',
            },
          });
        }

        const streakEmoji =
          history.maxStreak >= 7
            ? '🔥🔥'
            : history.maxStreak >= 3
              ? '⚡⚡'
              : '🏆';

        let response = `📊 **Group History & Achievements**\n\n`;
        response += `${streakEmoji} **All-time best streak:** ${history.maxStreak} day${history.maxStreak !== 1 ? 's' : ''}\n`;
        response += `🏆 **Current streak:** ${groupData.streak} day${groupData.streak !== 1 ? 's' : ''}\n`;
        response += `📈 **Total group completion days:** ${history.totalGroupDays}\n`;

        if (history.firstGroupDay) {
          response += `🗓️ **First group day:** ${history.firstGroupDay}\n\n`;
        }

        // Recent activity (last 7 days)
        if (history.streakHistory.length > 0) {
          response += `📅 **Recent Activity (Last ${Math.min(7, history.streakHistory.length)} days):**\n`;
          const recentDays = history.streakHistory.slice(-7);

          recentDays.forEach((day) => {
            const dayEmoji =
              day.streak >= 7 ? '🔥' : day.streak >= 3 ? '⚡' : '✅';
            response += `${dayEmoji} ${day.date}: Streak ${day.streak} (${day.participants.join(', ')})\n`;
          });

          response += `\n💪 Keep building that group streak!`;
        }

        return new JsonResponse({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: response,
          },
        });
      }
      case AWW_COMMAND.name.toLowerCase(): {
        const cuteUrl = await getCuteUrl();
        return new JsonResponse({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: cuteUrl,
          },
        });
      }
      case INVITE_COMMAND.name.toLowerCase(): {
        const applicationId = env.DISCORD_APPLICATION_ID;
        const INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${applicationId}&scope=applications.commands`;
        return new JsonResponse({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: INVITE_URL,
            flags: InteractionResponseFlags.EPHEMERAL,
          },
        });
      }
      case QUESTION_INFO_COMMAND.name.toLowerCase(): {
        const questionId = interaction.data.options?.[0]?.value;

        if (!questionId) {
          return new JsonResponse({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: 'Error: Please provide a question ID.',
              flags: InteractionResponseFlags.EPHEMERAL,
            },
          });
        }

        try {
          // Try to get question by ID first, then by slug if that fails
          let question = await getQuestionById(questionId);

          if (!question) {
            // If ID lookup fails, the user might have provided a slug
            question = await getQuestionBySlug(questionId.toString());
          }

          if (!question) {
            const isNumber = !isNaN(parseInt(questionId));
            const message = isNumber
              ? `❌ Question ${questionId} not found in our database.\n\n💡 **Supported questions:** 1-50, plus many popular ones (70, 121, 206, 226, etc.)\n\n📝 **Alternative:** Try using the question slug (e.g., "two-sum")`
              : `❌ Could not find question with slug: "${questionId}"\n\n💡 **Tip:** Use question numbers (1, 2, 3...) or exact slugs (e.g., "two-sum")`;

            return new JsonResponse({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: message,
                flags: InteractionResponseFlags.EPHEMERAL,
              },
            });
          }

          const difficulty = formatDifficulty(question.difficulty);
          const isPaid = question.isPaidOnly ? '🔒 Premium' : '🆓 Free';
          const topics = question.topicTags
            ? question.topicTags.map((tag) => tag.name).join(', ')
            : 'N/A';

          const embed = {
            title: `${question.questionFrontendId}. ${question.title}`,
            url: `https://leetcode.com/problems/${question.titleSlug}/`,
            color:
              question.difficulty === 'Easy'
                ? 0x00ff00
                : question.difficulty === 'Medium'
                  ? 0xffaa00
                  : 0xff0000,
            fields: [
              {
                name: 'Difficulty',
                value: difficulty,
                inline: true,
              },
              {
                name: 'Access',
                value: isPaid,
                inline: true,
              },
              {
                name: '👍 Likes',
                value: question.likes?.toString() || 'N/A',
                inline: true,
              },
              {
                name: '👎 Dislikes',
                value: question.dislikes?.toString() || 'N/A',
                inline: true,
              },
              {
                name: 'Topics',
                value: topics || 'N/A',
                inline: false,
              },
            ],
            footer: {
              text: `Question ID: ${question.questionId} | Frontend ID: ${question.questionFrontendId}`,
            },
          };

          return new JsonResponse({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              embeds: [embed],
            },
          });
        } catch (error) {
          console.error('Error fetching question info:', error);
          return new JsonResponse({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `❌ Failed to fetch question information. Please try again later.`,
              flags: InteractionResponseFlags.EPHEMERAL,
            },
          });
        }
      }
      case LEETCODE_PROFILE_COMMAND.name.toLowerCase(): {
        const username = interaction.data.options?.[0]?.value;

        if (!username) {
          return new JsonResponse({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: 'Error: Please provide a LeetCode username.',
              flags: InteractionResponseFlags.EPHEMERAL,
            },
          });
        }

        try {
          const [profile, problemStats, recentSubmissions] = await Promise.all([
            getUserProfile(username),
            getUserProblemStats(username),
            getUserRecentSubmissions(username, 5),
          ]);

          if (!profile) {
            return new JsonResponse({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: `❌ Could not find LeetCode user: ${username}`,
                flags: InteractionResponseFlags.EPHEMERAL,
              },
            });
          }

          const embed = {
            title: `${profile.username}'s LeetCode Profile`,
            url: `https://leetcode.com/u/${username}/`,
            color: 0xffa500,
            thumbnail: {
              url:
                profile.profile.userAvatar ||
                'https://leetcode.com/static/images/LeetCode_Sharing.png',
            },
            fields: [],
          };

          // Basic profile info
          if (profile.profile.realName) {
            embed.fields.push({
              name: 'Real Name',
              value: profile.profile.realName,
              inline: true,
            });
          }

          if (profile.profile.ranking) {
            embed.fields.push({
              name: 'Global Ranking',
              value: `#${profile.profile.ranking.toLocaleString()}`,
              inline: true,
            });
          }

          if (profile.profile.reputation) {
            embed.fields.push({
              name: 'Reputation',
              value: profile.profile.reputation.toString(),
              inline: true,
            });
          }

          // Problem stats
          if (problemStats?.userStats?.submitStatsGlobal?.acSubmissionNum) {
            const stats =
              problemStats.userStats.submitStatsGlobal.acSubmissionNum;
            const easy = stats.find((s) => s.difficulty === 'Easy')?.count || 0;
            const medium =
              stats.find((s) => s.difficulty === 'Medium')?.count || 0;
            const hard = stats.find((s) => s.difficulty === 'Hard')?.count || 0;
            const total = easy + medium + hard;

            embed.fields.push({
              name: 'Problems Solved',
              value: `**${total}** total\n🟢 Easy: ${easy}\n🟡 Medium: ${medium}\n🔴 Hard: ${hard}`,
              inline: true,
            });
          }

          // Recent submissions
          if (recentSubmissions && recentSubmissions.length > 0) {
            const recentList = recentSubmissions
              .slice(0, 3)
              .map((sub) => `• ${sub.title}`)
              .join('\n');

            embed.fields.push({
              name: 'Recent Submissions',
              value: recentList,
              inline: false,
            });
          }

          // Company and location
          const details = [];
          if (profile.profile.company)
            details.push(`🏢 ${profile.profile.company}`);
          if (profile.profile.school)
            details.push(`🎓 ${profile.profile.school}`);
          if (profile.profile.countryName)
            details.push(`🌍 ${profile.profile.countryName}`);

          if (details.length > 0) {
            embed.fields.push({
              name: 'Details',
              value: details.join('\n'),
              inline: false,
            });
          }

          return new JsonResponse({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              embeds: [embed],
            },
          });
        } catch (error) {
          console.error('Error fetching LeetCode profile:', error);
          return new JsonResponse({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `❌ Failed to fetch LeetCode profile for ${username}. Please try again later.`,
              flags: InteractionResponseFlags.EPHEMERAL,
            },
          });
        }
      }
      case DAILY_CHALLENGE_COMMAND.name.toLowerCase(): {
        try {
          const dailyChallenge = await getDailyChallenge();

          if (!dailyChallenge) {
            return new JsonResponse({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content:
                  "❌ Could not fetch today's daily challenge. Please try again later.",
                flags: InteractionResponseFlags.EPHEMERAL,
              },
            });
          }

          const question = dailyChallenge.question;
          const difficulty = formatDifficulty(question.difficulty);
          const isPaid = question.paidOnly ? '🔒 Premium' : '🆓 Free';
          const topics = question.topicTags
            ? question.topicTags.map((tag) => tag.name).join(', ')
            : 'N/A';

          const embed = {
            title: `📅 Daily Challenge - ${dailyChallenge.date}`,
            description: `**${question.frontendQuestionId}. ${question.title}**`,
            url: `https://leetcode.com${dailyChallenge.link}`,
            color:
              question.difficulty === 'Easy'
                ? 0x00ff00
                : question.difficulty === 'Medium'
                  ? 0xffaa00
                  : 0xff0000,
            fields: [
              {
                name: 'Difficulty',
                value: difficulty,
                inline: true,
              },
              {
                name: 'Access',
                value: isPaid,
                inline: true,
              },
              {
                name: 'Acceptance Rate',
                value: `${question.acRate.toFixed(1)}%`,
                inline: true,
              },
              {
                name: 'Topics',
                value: topics,
                inline: false,
              },
            ],
            footer: {
              text: "💪 Good luck with today's challenge!",
            },
          };

          if (question.hasVideoSolution) {
            embed.fields.push({
              name: '🎥 Video Solution',
              value: 'Available',
              inline: true,
            });
          }

          return new JsonResponse({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              embeds: [embed],
            },
          });
        } catch (error) {
          console.error('Error fetching daily challenge:', error);
          return new JsonResponse({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content:
                "❌ Failed to fetch today's daily challenge. Please try again later.",
              flags: InteractionResponseFlags.EPHEMERAL,
            },
          });
        }
      }
      default:
        console.log('❌ Unknown command:', interaction.data?.name);
        return new JsonResponse({ error: 'Unknown Type' }, { status: 400 });
    }
  }

  console.error('❌ Unknown interaction type:', interaction.type);
  return new JsonResponse({ error: 'Unknown Type' }, { status: 400 });
});
router.all('*', () => new Response('Not Found.', { status: 404 }));

async function verifyDiscordRequest(request, env) {
  const signature = request.headers.get('x-signature-ed25519');
  const timestamp = request.headers.get('x-signature-timestamp');
  const body = await request.text();
  const isValidRequest =
    signature &&
    timestamp &&
    (await verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY));
  if (!isValidRequest) {
    return { isValid: false };
  }

  return { interaction: JSON.parse(body), isValid: true };
}

const server = {
  verifyDiscordRequest,
  fetch: router.fetch,
};

export default server;
