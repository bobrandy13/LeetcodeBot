/**
 * Share command metadata from a common spot to be used for both runtime
 * and registration.
 */

export const AWW_COMMAND = {
  name: 'awwww',
  description: 'Drop some cuteness on this channel.',
};

export const INVITE_COMMAND = {
  name: 'invite',
  description: 'Get an invite link to add the bot to your server',
};

export const QUESTION_COMPLETE = {
  name: 'complete',
  description: 'Mark a question as complete when you did it',
  options: [
    {
      name: 'question_id',
      description: 'The ID of the question you completed',
      type: 4, // INTEGER type
      required: true,
    },
  ],
};

export const STATS_COMMAND = {
  name: 'stats',
  description: 'View your completion statistics and streak',
};

export const GROUP_STATS_COMMAND = {
  name: 'group-stats',
  description: "View everyone's completion statistics",
};

export const GROUP_STREAK_COMMAND = {
  name: 'group-streak',
  description:
    'View the daily group streak (everyone must complete a question)',
};

export const PLAYER_STATS_COMMAND = {
  name: 'player-stats',
  description: "View a specific player's statistics",
  options: [
    {
      name: 'username',
      description: 'The username of the player to view stats for',
      type: 3, // STRING type
      required: true,
      choices: [
        { name: 'razar0200', value: 'razar0200' },
        { name: 'bobrandy', value: 'bobrandy' },
        { name: 'drag0n0', value: 'drag0n0' },
        { name: 'esshaygod', value: 'esshaygod' },
      ],
    },
  ],
};

export const GROUP_HISTORY_COMMAND = {
  name: 'group-history',
  description: "View the group's past streak statistics and achievements",
};

export const QUESTION_INFO_COMMAND = {
  name: 'question-info',
  description: 'Get details about a LeetCode question by ID',
  options: [
    {
      name: 'question_id',
      description: 'The ID of the question to look up',
      type: 4, // INTEGER type
      required: true,
    },
  ],
};

export const LEETCODE_PROFILE_COMMAND = {
  name: 'leetcode-profile',
  description: 'View a LeetCode user profile with stats and rankings',
  options: [
    {
      name: 'username',
      description: 'LeetCode username to look up',
      type: 3, // STRING type
      required: true,
    },
  ],
};

export const DAILY_CHALLENGE_COMMAND = {
  name: 'daily-challenge',
  description: "View today's LeetCode daily challenge",
};
