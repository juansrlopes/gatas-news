#!/usr/bin/env node

/**
 * Serper API Key Testing Script
 *
 * Tests all configured Serper API keys to check their status and rate limits.
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
    log(colors.blue, `\n🔍 Testing Serper key ${keyNumber}/${totalKeys}: ${maskedKey}`);

    const startTime = Date.now();
    const response = await axios.post('https://google.serper.dev/search', {
      q: 'test',
      gl: 'br',
      hl: 'pt',
      num: 1,
    }, {
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
        'User-Agent': 'Gatas-News-KeyTester/1.0',
      },
      timeout: 10000,
    });

    const responseTime = Date.now() - startTime;

    if (response.status === 200) {
      const data = response.data;
      log(colors.green, `✅ Serper key ${keyNumber} is WORKING`);
      log(colors.cyan, `   📊 Response time: ${responseTime}ms`);
      log(colors.cyan, `   🔍 Search results: ${data.organic?.length || 0} organic results`);
      log(colors.cyan, `   📰 News results: ${data.news?.length || 0} news results`);

      // Serper doesn't provide rate limit headers in the same way
      // But we can check if the response looks healthy
      if (data.organic || data.news) {
        log(colors.cyan, `   ✅ API responding with valid data`);
      }

      return {
        working: true,
        key: maskedKey,
        responseTime,
        hasData: !!(data.organic || data.news),
        organicResults: data.organic?.length || 0,
        newsResults: data.news?.length || 0,
      };
    }
  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || error.response.statusText;

      if (status === 429) {
        log(colors.red, `❌ Serper key ${keyNumber} is RATE LIMITED`);
        log(colors.yellow, `   💡 ${message || 'Too many requests'}`);
        log(colors.yellow, `   ⏰ Rate limits typically reset within an hour`);
      } else if (status === 401 || status === 403) {
        log(colors.red, `❌ Serper key ${keyNumber} is INVALID`);
        log(colors.yellow, `   💡 ${message || 'Invalid API key'}`);
      } else {
        log(colors.red, `❌ Serper key ${keyNumber} failed with HTTP ${status}`);
        log(colors.yellow, `   💡 ${message || 'Unknown error'}`);
      }

      return {
        working: false,
        key: maskedKey,
        error: `HTTP ${status}: ${message}`,
        rateLimited: status === 429,
        invalid: status === 401,
      };
    } else {
      log(colors.red, `❌ Serper key ${keyNumber} failed: ${error.message}`);
      return {
        working: false,
        key: maskedKey,
        error: error.message,
      };
    }
  }
}

async function main() {
  log(colors.bold + colors.cyan, '\n🔑 GATAS NEWS - SERPER API KEY TESTER');
  log(colors.cyan, '='.repeat(50));

  // Collect all Serper API keys
  const apiKeys = [
    process.env.SERPER_API_KEY,
    process.env.SERPER_API_KEY_BACKUP,
  ].filter(Boolean);

  if (apiKeys.length === 0) {
    log(colors.red, '❌ No Serper API keys found in environment variables');
    log(colors.yellow, '💡 Make sure these are set in your .env file:');
    log(colors.yellow, '   - SERPER_API_KEY');
    log(colors.yellow, '   - SERPER_API_KEY_BACKUP');
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
    log(colors.green, '\n🎉 GOOD NEWS: You have working Serper API keys!');
    log(colors.cyan, '💡 The API server should start successfully.');

    // Show fastest key
    const fastestKey = workingKeys.reduce((fastest, current) =>
      current.responseTime < fastest.responseTime ? current : fastest
    );
    log(colors.cyan, `⚡ Fastest key: ${fastestKey.key} (${fastestKey.responseTime}ms)`);
    
    // Show data availability
    const keysWithData = workingKeys.filter(k => k.hasData);
    if (keysWithData.length > 0) {
      log(colors.cyan, `📊 Keys returning data: ${keysWithData.length}/${workingKeys.length}`);
    }
  } else {
    log(colors.red, '\n🚨 BAD NEWS: No working Serper API keys found!');
    log(colors.yellow, '💡 Solutions:');

    if (rateLimitedKeys.length > 0) {
      log(colors.yellow, '   1. ⏰ Wait for rate limits to reset (~1 hour)');
      log(colors.yellow, '   2. 🔑 Get additional API keys from https://serper.dev/');
    }

    if (invalidKeys.length > 0) {
      log(colors.yellow, '   3. 🔄 Replace invalid keys with new ones');
    }

    log(colors.yellow, '   4. 💰 Upgrade to a paid Serper plan for higher limits');
    log(colors.red, '\n❌ The API server will NOT start until you have working keys.');
  }

  log(colors.cyan, '\n🔗 Get more keys: https://serper.dev/');
  log(colors.cyan, '📚 Rate limits: https://serper.dev/pricing');

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
