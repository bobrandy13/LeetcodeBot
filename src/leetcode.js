/**
 * LeetCode API utilities for fetching question and user data
 */

const LEETCODE_GRAPHQL_ENDPOINT = 'https://leetcode.com/graphql';

/**
 * Make a GraphQL request to LeetCode API
 */
async function makeGraphQLRequest(query, variables = {}) {
  try {
    const response = await fetch(LEETCODE_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.errors) {
      throw new Error(
        `GraphQL error: ${data.errors.map((e) => e.message).join(', ')}`
      );
    }

    return data.data;
  } catch (error) {
    console.error('LeetCode API request failed:', error);
    throw error;
  }
}

// Cache for question mappings (number -> slug)
let questionMappingCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Fetch all problems from LeetCode and build a mapping
 */
async function fetchAllProblems() {
  const query = `
    query problemsetQuestionList(
      $categorySlug: String,
      $limit: Int,
      $skip: Int,
      $filters: QuestionListFilterInput
    ) {
      problemsetQuestionList: questionList(
        categorySlug: $categorySlug
        limit: $limit
        skip: $skip
        filters: $filters
      ) {
        total: totalNum
        questions: data {
          acRate
          difficulty
          likes
          dislikes
          stats
          categoryTitle
          frontendQuestionId: questionFrontendId
          paidOnly: isPaidOnly
          title
          titleSlug
          topicTags {
            name
            id
            slug
          }
          hasSolution
          hasVideoSolution
        }
      }
    }
  `;

  try {
    const data = await makeGraphQLRequest(query, {
      categorySlug: '',
      skip: 0,
      limit: 3000, // Get a large number to cover all questions
      filters: {},
    });

    const mapping = {};
    if (data.problemsetQuestionList && data.problemsetQuestionList.questions) {
      data.problemsetQuestionList.questions.forEach((question) => {
        const frontendId = parseInt(question.frontendQuestionId);
        if (!isNaN(frontendId)) {
          mapping[frontendId] = {
            slug: question.titleSlug,
            title: question.title,
            difficulty: question.difficulty,
            isPaidOnly: question.paidOnly,
            likes: question.likes,
            dislikes: question.dislikes,
            topicTags: question.topicTags,
          };
        }
      });
    }

    return mapping;
  } catch (error) {
    console.error('Failed to fetch all problems:', error);
    return null;
  }
}

/**
 * Get or build the question mapping cache
 */
async function getQuestionMapping() {
  // Always use static mapping to avoid API delays and timeouts
  return getStaticQuestionMapping();
}

/**
 * Static fallback mapping for common questions
 */
function getStaticQuestionMapping() {
  return {
    1: {
      slug: 'two-sum',
      title: 'Two Sum',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    2: {
      slug: 'add-two-numbers',
      title: 'Add Two Numbers',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    3: {
      slug: 'longest-substring-without-repeating-characters',
      title: 'Longest Substring Without Repeating Characters',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    4: {
      slug: 'median-of-two-sorted-arrays',
      title: 'Median of Two Sorted Arrays',
      difficulty: 'Hard',
      isPaidOnly: false,
    },
    5: {
      slug: 'longest-palindromic-substring',
      title: 'Longest Palindromic Substring',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    7: {
      slug: 'reverse-integer',
      title: 'Reverse Integer',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    8: {
      slug: 'string-to-integer-atoi',
      title: 'String to Integer (atoi)',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    9: {
      slug: 'palindrome-number',
      title: 'Palindrome Number',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    11: {
      slug: 'container-with-most-water',
      title: 'Container With Most Water',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    13: {
      slug: 'roman-to-integer',
      title: 'Roman to Integer',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    14: {
      slug: 'longest-common-prefix',
      title: 'Longest Common Prefix',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    15: {
      slug: 'three-sum',
      title: '3Sum',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    19: {
      slug: 'remove-nth-node-from-end-of-list',
      title: 'Remove Nth Node From End of List',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    20: {
      slug: 'valid-parentheses',
      title: 'Valid Parentheses',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    21: {
      slug: 'merge-two-sorted-lists',
      title: 'Merge Two Sorted Lists',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    22: {
      slug: 'generate-parentheses',
      title: 'Generate Parentheses',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    23: {
      slug: 'merge-k-sorted-lists',
      title: 'Merge k Sorted Lists',
      difficulty: 'Hard',
      isPaidOnly: false,
    },
    26: {
      slug: 'remove-duplicates-from-sorted-array',
      title: 'Remove Duplicates from Sorted Array',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    27: {
      slug: 'remove-element',
      title: 'Remove Element',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    28: {
      slug: 'find-the-index-of-the-first-occurrence-in-a-string',
      title: 'Find the Index of the First Occurrence in a String',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    33: {
      slug: 'search-in-rotated-sorted-array',
      title: 'Search in Rotated Sorted Array',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    34: {
      slug: 'find-first-and-last-position-of-element-in-sorted-array',
      title: 'Find First and Last Position of Element in Sorted Array',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    35: {
      slug: 'search-insert-position',
      title: 'Search Insert Position',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    39: {
      slug: 'combination-sum',
      title: 'Combination Sum',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    42: {
      slug: 'trapping-rain-water',
      title: 'Trapping Rain Water',
      difficulty: 'Hard',
      isPaidOnly: false,
    },
    46: {
      slug: 'permutations',
      title: 'Permutations',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    48: {
      slug: 'rotate-image',
      title: 'Rotate Image',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    49: {
      slug: 'group-anagrams',
      title: 'Group Anagrams',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    53: {
      slug: 'maximum-subarray',
      title: 'Maximum Subarray',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    54: {
      slug: 'spiral-matrix',
      title: 'Spiral Matrix',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    55: {
      slug: 'jump-game',
      title: 'Jump Game',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    56: {
      slug: 'merge-intervals',
      title: 'Merge Intervals',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    62: {
      slug: 'unique-paths',
      title: 'Unique Paths',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    64: {
      slug: 'minimum-path-sum',
      title: 'Minimum Path Sum',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    66: {
      slug: 'plus-one',
      title: 'Plus One',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    67: {
      slug: 'add-binary',
      title: 'Add Binary',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    69: {
      slug: 'sqrtx',
      title: 'Sqrt(x)',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    70: {
      slug: 'climbing-stairs',
      title: 'Climbing Stairs',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    73: {
      slug: 'set-matrix-zeroes',
      title: 'Set Matrix Zeroes',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    75: {
      slug: 'sort-colors',
      title: 'Sort Colors',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    76: {
      slug: 'minimum-window-substring',
      title: 'Minimum Window Substring',
      difficulty: 'Hard',
      isPaidOnly: false,
    },
    78: {
      slug: 'subsets',
      title: 'Subsets',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    79: {
      slug: 'word-search',
      title: 'Word Search',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    84: {
      slug: 'largest-rectangle-in-histogram',
      title: 'Largest Rectangle in Histogram',
      difficulty: 'Hard',
      isPaidOnly: false,
    },
    88: {
      slug: 'merge-sorted-array',
      title: 'Merge Sorted Array',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    91: {
      slug: 'decode-ways',
      title: 'Decode Ways',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    94: {
      slug: 'binary-tree-inorder-traversal',
      title: 'Binary Tree Inorder Traversal',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    98: {
      slug: 'validate-binary-search-tree',
      title: 'Validate Binary Search Tree',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    100: {
      slug: 'same-tree',
      title: 'Same Tree',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    101: {
      slug: 'symmetric-tree',
      title: 'Symmetric Tree',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    102: {
      slug: 'binary-tree-level-order-traversal',
      title: 'Binary Tree Level Order Traversal',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    104: {
      slug: 'maximum-depth-of-binary-tree',
      title: 'Maximum Depth of Binary Tree',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    105: {
      slug: 'construct-binary-tree-from-preorder-and-inorder-traversal',
      title: 'Construct Binary Tree from Preorder and Inorder Traversal',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    110: {
      slug: 'balanced-binary-tree',
      title: 'Balanced Binary Tree',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    111: {
      slug: 'minimum-depth-of-binary-tree',
      title: 'Minimum Depth of Binary Tree',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    112: {
      slug: 'path-sum',
      title: 'Path Sum',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    118: {
      slug: 'pascals-triangle',
      title: "Pascal's Triangle",
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    121: {
      slug: 'best-time-to-buy-and-sell-stock',
      title: 'Best Time to Buy and Sell Stock',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    125: {
      slug: 'valid-palindrome',
      title: 'Valid Palindrome',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    128: {
      slug: 'longest-consecutive-sequence',
      title: 'Longest Consecutive Sequence',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    133: {
      slug: 'clone-graph',
      title: 'Clone Graph',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    134: {
      slug: 'gas-station',
      title: 'Gas Station',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    136: {
      slug: 'single-number',
      title: 'Single Number',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    138: {
      slug: 'copy-list-with-random-pointer',
      title: 'Copy List with Random Pointer',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    139: {
      slug: 'word-break',
      title: 'Word Break',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    141: {
      slug: 'linked-list-cycle',
      title: 'Linked List Cycle',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    142: {
      slug: 'linked-list-cycle-ii',
      title: 'Linked List Cycle II',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    143: {
      slug: 'reorder-list',
      title: 'Reorder List',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    144: {
      slug: 'binary-tree-preorder-traversal',
      title: 'Binary Tree Preorder Traversal',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    146: {
      slug: 'lru-cache',
      title: 'LRU Cache',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    148: {
      slug: 'sort-list',
      title: 'Sort List',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    150: {
      slug: 'evaluate-reverse-polish-notation',
      title: 'Evaluate Reverse Polish Notation',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    152: {
      slug: 'maximum-product-subarray',
      title: 'Maximum Product Subarray',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    153: {
      slug: 'find-minimum-in-rotated-sorted-array',
      title: 'Find Minimum in Rotated Sorted Array',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    155: {
      slug: 'min-stack',
      title: 'Min Stack',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    160: {
      slug: 'intersection-of-two-linked-lists',
      title: 'Intersection of Two Linked Lists',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    167: {
      slug: 'two-sum-ii-input-array-is-sorted',
      title: 'Two Sum II - Input Array Is Sorted',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    169: {
      slug: 'majority-element',
      title: 'Majority Element',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    171: {
      slug: 'excel-sheet-column-number',
      title: 'Excel Sheet Column Number',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    190: {
      slug: 'reverse-bits',
      title: 'Reverse Bits',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    191: {
      slug: 'number-of-1-bits',
      title: 'Number of 1 Bits',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    198: {
      slug: 'house-robber',
      title: 'House Robber',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    200: {
      slug: 'number-of-islands',
      title: 'Number of Islands',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    202: {
      slug: 'happy-number',
      title: 'Happy Number',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    206: {
      slug: 'reverse-linked-list',
      title: 'Reverse Linked List',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    207: {
      slug: 'course-schedule',
      title: 'Course Schedule',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    208: {
      slug: 'implement-trie-prefix-tree',
      title: 'Implement Trie (Prefix Tree)',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    209: {
      slug: 'minimum-size-subarray-sum',
      title: 'Minimum Size Subarray Sum',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    210: {
      slug: 'course-schedule-ii',
      title: 'Course Schedule II',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    217: {
      slug: 'contains-duplicate',
      title: 'Contains Duplicate',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    226: {
      slug: 'invert-binary-tree',
      title: 'Invert Binary Tree',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    230: {
      slug: 'kth-smallest-element-in-a-bst',
      title: 'Kth Smallest Element in a BST',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    234: {
      slug: 'palindrome-linked-list',
      title: 'Palindrome Linked List',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    235: {
      slug: 'lowest-common-ancestor-of-a-binary-search-tree',
      title: 'Lowest Common Ancestor of a Binary Search Tree',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    236: {
      slug: 'lowest-common-ancestor-of-a-binary-tree',
      title: 'Lowest Common Ancestor of a Binary Tree',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    238: {
      slug: 'product-of-array-except-self',
      title: 'Product of Array Except Self',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    239: {
      slug: 'sliding-window-maximum',
      title: 'Sliding Window Maximum',
      difficulty: 'Hard',
      isPaidOnly: false,
    },
    242: {
      slug: 'valid-anagram',
      title: 'Valid Anagram',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    252: {
      slug: 'meeting-rooms',
      title: 'Meeting Rooms',
      difficulty: 'Easy',
      isPaidOnly: true,
    },
    253: {
      slug: 'meeting-rooms-ii',
      title: 'Meeting Rooms II',
      difficulty: 'Medium',
      isPaidOnly: true,
    },
    268: {
      slug: 'missing-number',
      title: 'Missing Number',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    269: {
      slug: 'alien-dictionary',
      title: 'Alien Dictionary',
      difficulty: 'Hard',
      isPaidOnly: true,
    },
    271: {
      slug: 'encode-and-decode-strings',
      title: 'Encode and Decode Strings',
      difficulty: 'Medium',
      isPaidOnly: true,
    },
    283: {
      slug: 'move-zeroes',
      title: 'Move Zeroes',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    287: {
      slug: 'find-the-duplicate-number',
      title: 'Find the Duplicate Number',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    300: {
      slug: 'longest-increasing-subsequence',
      title: 'Longest Increasing Subsequence',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    322: {
      slug: 'coin-change',
      title: 'Coin Change',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    347: {
      slug: 'top-k-frequent-elements',
      title: 'Top K Frequent Elements',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    371: {
      slug: 'sum-of-two-integers',
      title: 'Sum of Two Integers',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    383: {
      slug: 'ransom-note',
      title: 'Ransom Note',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    387: {
      slug: 'first-unique-character-in-a-string',
      title: 'First Unique Character in a String',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    392: {
      slug: 'is-subsequence',
      title: 'Is Subsequence',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    417: {
      slug: 'pacific-atlantic-water-flow',
      title: 'Pacific Atlantic Water Flow',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    424: {
      slug: 'longest-repeating-character-replacement',
      title: 'Longest Repeating Character Replacement',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    435: {
      slug: 'non-overlapping-intervals',
      title: 'Non-overlapping Intervals',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    448: {
      slug: 'find-all-numbers-disappeared-in-an-array',
      title: 'Find All Numbers Disappeared in an Array',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    494: {
      slug: 'target-sum',
      title: 'Target Sum',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    509: {
      slug: 'fibonacci-number',
      title: 'Fibonacci Number',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    518: {
      slug: 'coin-change-ii',
      title: 'Coin Change II',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    543: {
      slug: 'diameter-of-binary-tree',
      title: 'Diameter of Binary Tree',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    572: {
      slug: 'subtree-of-another-tree',
      title: 'Subtree of Another Tree',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    647: {
      slug: 'palindromic-substrings',
      title: 'Palindromic Substrings',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    695: {
      slug: 'max-area-of-island',
      title: 'Max Area of Island',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    704: {
      slug: 'binary-search',
      title: 'Binary Search',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    707: {
      slug: 'design-linked-list',
      title: 'Design Linked List',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    739: {
      slug: 'daily-temperatures',
      title: 'Daily Temperatures',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    746: {
      slug: 'min-cost-climbing-stairs',
      title: 'Min Cost Climbing Stairs',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    875: {
      slug: 'koko-eating-bananas',
      title: 'Koko Eating Bananas',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    981: {
      slug: 'time-based-key-value-store',
      title: 'Time Based Key-Value Store',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    1046: {
      slug: 'last-stone-weight',
      title: 'Last Stone Weight',
      difficulty: 'Easy',
      isPaidOnly: false,
    },
    1143: {
      slug: 'longest-common-subsequence',
      title: 'Longest Common Subsequence',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    1448: {
      slug: 'count-good-nodes-in-binary-tree',
      title: 'Count Good Nodes in Binary Tree',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
    1584: {
      slug: 'min-cost-to-connect-all-points',
      title: 'Min Cost to Connect All Points',
      difficulty: 'Medium',
      isPaidOnly: false,
    },
  };
}

/**
 * Get question details by question ID
 * Uses dynamic mapping from LeetCode API
 */
export async function getQuestionById(questionId) {
  const frontendId = parseInt(questionId);

  if (isNaN(frontendId)) {
    // If it's not a number, treat it as a slug
    return await getQuestionBySlug(questionId.toString());
  }

  try {
    // Get the question mapping
    const mapping = await getQuestionMapping();

    if (mapping && mapping[frontendId]) {
      const questionData = mapping[frontendId];

      // If we have basic data from the mapping, we can use it directly
      // or fetch more detailed info using the slug
      return {
        questionId: frontendId.toString(),
        questionFrontendId: frontendId.toString(),
        title: questionData.title,
        titleSlug: questionData.slug,
        isPaidOnly: questionData.isPaidOnly,
        difficulty: questionData.difficulty,
        likes: questionData.likes,
        dislikes: questionData.dislikes,
        topicTags: questionData.topicTags || [],
      };
    }

    // If not found in mapping, question might not exist
    return null;
  } catch (error) {
    console.error(`Error getting question ${questionId}:`, error);
    return null;
  }
}

/**
 * Get question details by title slug
 */
export async function getQuestionBySlug(titleSlug) {
  // Find question by slug in static mapping to avoid API delays
  const mapping = await getQuestionMapping();

  for (const [id, question] of Object.entries(mapping)) {
    if (question.slug === titleSlug) {
      return {
        questionId: id,
        questionFrontendId: id,
        title: question.title,
        titleSlug: question.slug,
        isPaidOnly: question.isPaidOnly,
        difficulty: question.difficulty,
        likes: question.likes || 0,
        dislikes: question.dislikes || 0,
        topicTags: question.topicTags || [],
      };
    }
  }

  return null;
}

/**
 * Get user's public profile information
 */
export async function getUserProfile(username) {
  // Return mock data to avoid API delays
  return {
    username: username,
    profile: {
      ranking: null,
      userAvatar: null,
      realName: null,
      aboutMe: null,
      school: null,
      websites: [],
      countryName: null,
      company: null,
      jobTitle: null,
      skillTags: [],
      postViewCount: 0,
      postViewCountDiff: 0,
      reputation: 0,
      reputationDiff: 0,
      solutionCount: 0,
      solutionCountDiff: 0,
      categoryDiscussCount: 0,
      categoryDiscussCountDiff: 0,
    },
  };
}

/**
 * Get user's problem solving statistics
 */
export async function getUserProblemStats(username) {
  // Return mock data to avoid API delays
  return {
    allQuestions: [
      { difficulty: 'Easy', count: 800 },
      { difficulty: 'Medium', count: 1700 },
      { difficulty: 'Hard', count: 700 },
    ],
    userStats: {
      problemsSolvedBeatsStats: [
        { difficulty: 'Easy', percentage: 0 },
        { difficulty: 'Medium', percentage: 0 },
        { difficulty: 'Hard', percentage: 0 },
      ],
      submitStatsGlobal: {
        acSubmissionNum: [
          { difficulty: 'Easy', count: 0 },
          { difficulty: 'Medium', count: 0 },
          { difficulty: 'Hard', count: 0 },
        ],
      },
    },
  };
}

/**
 * Get user's recent accepted submissions
 */
export async function getUserRecentSubmissions(username, limit = 15) {
  // Return mock data to avoid API delays
  return [];
}

/**
 * Get today's daily challenge
 */
export async function getDailyChallenge() {
  // Return mock data to avoid API delays
  return {
    date: new Date().toISOString().split('T')[0],
    question: {
      acRate: 45.5,
      difficulty: 'Medium',
      frontendQuestionId: '287',
      title: 'Find the Duplicate Number',
      titleSlug: 'find-the-duplicate-number',
      isPaidOnly: false,
      topicTags: [
        { name: 'Array', slug: 'array' },
        { name: 'Two Pointers', slug: 'two-pointers' },
        { name: 'Binary Search', slug: 'binary-search' },
      ],
    },
  };
}

/**
 * Get user's contest ranking information
 */
export async function getUserContestRanking(username) {
  // Return mock data to avoid API delays
  return {
    ranking: {
      attendedContestsCount: 0,
      rating: 0,
      globalRanking: 0,
      totalParticipants: 0,
      topPercentage: 0,
      badge: null,
    },
    history: [],
  };
}

/**
 * Helper function to format difficulty
 */
export function formatDifficulty(difficulty) {
  const difficultyMap = {
    Easy: '🟢 Easy',
    Medium: '🟡 Medium',
    Hard: '🔴 Hard',
  };
  return difficultyMap[difficulty] || difficulty;
}

/**
 * Helper function to format timestamp
 */
export function formatTimestamp(timestamp) {
  return new Date(timestamp * 1000).toLocaleDateString();
}
