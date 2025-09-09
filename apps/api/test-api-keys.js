#!/usr/bin/env node

/**
 * API Key Testing Script
 *
 * Tests all configured NewsAPI keys to check their status and rate limits.
 * Run this script to verify which keys are working before starting the API.
 *
 * Usage:
 *   node test-api-keys.js
 *   npm run test:keys
 */

/* eslint-disable @typescript-eslint/no-require-imports */

const axios = require('axios');
const path = require('path');
// const fs = require('fs'); // Unused import

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') });

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testApiKey(apiKey, keyNumber, totalKeys) {
  const maskedKey = `${apiKey.substring(0, 8)}...`;

  try {
    log(colors.blue, `\n🔍 Testing key ${keyNumber}/${totalKeys}: ${maskedKey}`);

    const startTime = Date.now();
    const response = await axios.get('https://newsapi.org/v2/everything', {
      params: {
        q: 'test',
        pageSize: 1,
        language: 'pt',
      },
      headers: {
        'X-API-Key': apiKey,
        'User-Agent': 'Gatas-News-KeyTester/1.0',
      },
      timeout: 10000,
    });

    const responseTime = Date.now() - startTime;

    if (response.status === 200) {
      const data = response.data;
      log(colors.green, `✅ Key ${keyNumber} is WORKING`);
      log(colors.cyan, `   📊 Response time: ${responseTime}ms`);
      log(colors.cyan, `   📰 Total articles available: ${data.totalResults || 'Unknown'}`);

      // Check rate limit headers if available
      const remaining = response.headers['x-ratelimit-remaining'];
      const resetTime = response.headers['x-ratelimit-reset'];

      if (remaining !== undefined) {
        log(colors.cyan, `   🔄 Requests remaining: ${remaining}`);
      }

      if (resetTime) {
        const resetDate = new Date(parseInt(resetTime) * 1000);
        log(colors.cyan, `   ⏰ Rate limit resets: ${resetDate.toLocaleString()}`);
      }

      return {
        working: true,
        key: maskedKey,
        responseTime,
        remaining: remaining ? parseInt(remaining) : null,
        resetTime: resetTime ? new Date(parseInt(resetTime) * 1000) : null,
      };
    }
  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || error.response.statusText;

      if (status === 429) {
        log(colors.red, `❌ Key ${keyNumber} is RATE LIMITED`);
        log(colors.yellow, `   💡 ${message}`);

        // Try to extract reset time from error message
        const resetMatch = message.match(/(\d+)\s*hours?/i);
        if (resetMatch) {
          const hours = parseInt(resetMatch[1]);
          const resetTime = new Date(Date.now() + hours * 60 * 60 * 1000);
          log(colors.yellow, `   ⏰ Estimated reset: ${resetTime.toLocaleString()}`);
        }
      } else if (status === 401) {
        log(colors.red, `❌ Key ${keyNumber} is INVALID`);
        log(colors.yellow, `   💡 ${message}`);
      } else {
        log(colors.red, `❌ Key ${keyNumber} failed with HTTP ${status}`);
        log(colors.yellow, `   💡 ${message}`);
      }

      return {
        working: false,
        key: maskedKey,
        error: `HTTP ${status}: ${message}`,
        rateLimited: status === 429,
        invalid: status === 401,
      };
    } else {
      log(colors.red, `❌ Key ${keyNumber} failed: ${error.message}`);
      return {
        working: false,
        key: maskedKey,
        error: error.message,
      };
    }
  }
}

async function main() {
  log(colors.bold + colors.cyan, '\n🔑 GATAS NEWS - API KEY TESTER');
  log(colors.cyan, '='.repeat(50));

  // Collect all API keys
  const apiKeys = [
    process.env.NEWS_API_KEY,
    process.env.NEWS_API_KEY_BACKUP,
    process.env.NEWS_API_KEY_BACKUP_2,
  ].filter(Boolean);

  if (apiKeys.length === 0) {
    log(colors.red, '❌ No API keys found in environment variables');
    log(colors.yellow, '💡 Make sure these are set in your .env file:');
    log(colors.yellow, '   - NEWS_API_KEY');
    log(colors.yellow, '   - NEWS_API_KEY_BACKUP');
    log(colors.yellow, '   - NEWS_API_KEY_BACKUP_2');
    process.exit(1);
  }

  log(colors.blue, `\n📋 Found ${apiKeys.length} API key(s) to test`);

  const results = [];

  // Test each key
  for (let i = 0; i < apiKeys.length; i++) {
    const result = await testApiKey(apiKeys[i], i + 1, apiKeys.length);
    results.push(result);

    // Add delay between requests to be respectful
    if (i < apiKeys.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Summary
  log(colors.bold + colors.cyan, '\n📊 SUMMARY');
  log(colors.cyan, '='.repeat(30));

  const workingKeys = results.filter(r => r.working);
  const rateLimitedKeys = results.filter(r => r.rateLimited);
  const invalidKeys = results.filter(r => r.invalid);

  log(colors.green, `✅ Working keys: ${workingKeys.length}/${results.length}`);
  log(colors.red, `❌ Rate limited: ${rateLimitedKeys.length}/${results.length}`);
  log(colors.red, `🚫 Invalid keys: ${invalidKeys.length}/${results.length}`);

  if (workingKeys.length > 0) {
    log(colors.green, '\n🎉 GOOD NEWS: You have working API keys!');
    log(colors.cyan, '💡 The API server should start successfully.');

    // Show fastest key
    const fastestKey = workingKeys.reduce((fastest, current) =>
      current.responseTime < fastest.responseTime ? current : fastest
    );
    log(colors.cyan, `⚡ Fastest key: ${fastestKey.key} (${fastestKey.responseTime}ms)`);
  } else {
    log(colors.red, '\n🚨 BAD NEWS: No working API keys found!');
    log(colors.yellow, '💡 Solutions:');

    if (rateLimitedKeys.length > 0) {
      log(colors.yellow, '   1. ⏰ Wait for rate limits to reset (~24 hours)');
      log(colors.yellow, '   2. 🔑 Get additional API keys from https://newsapi.org/register');
    }

    if (invalidKeys.length > 0) {
      log(colors.yellow, '   3. 🔄 Replace invalid keys with new ones');
    }

    log(colors.yellow, '   4. 💰 Upgrade to a paid NewsAPI plan for higher limits');
    log(colors.red, '\n❌ The API server will NOT start until you have working keys.');
  }

  log(colors.cyan, '\n🔗 Get more keys: https://newsapi.org/register');
  log(colors.cyan, '📚 Rate limits: https://newsapi.org/pricing');

  // Exit with appropriate code
  process.exit(workingKeys.length > 0 ? 0 : 1);
}

// Handle errors gracefully
process.on('unhandledRejection', error => {
  log(colors.red, `\n💥 Unexpected error: ${error.message}`);
  process.exit(1);
});

// Run the script
main().catch(error => {
  log(colors.red, `\n💥 Script failed: ${error.message}`);
  process.exit(1);
});
