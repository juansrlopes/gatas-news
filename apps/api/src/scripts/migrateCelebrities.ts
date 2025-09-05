#!/usr/bin/env ts-node

/**
 * Celebrity Migration Script
 *
 * This script migrates celebrities from the JSON file to the MongoDB database.
 * Run this script once to perform the migration, then the JSON file can be removed.
 *
 * Usage:
 *   npx ts-node apps/api/src/scripts/migrateCelebrities.ts
 */

import fs from 'fs/promises';
import path from 'path';
import { mongoConnection } from '../database/connections/mongodb';
import { celebrityService } from '../services/celebrityService';
import logger from '../utils/logger';

interface JsonCelebrityData {
  celebrities: string[];
}

async function migrateCelebrities(): Promise<void> {
  try {
    logger.info('🚀 Starting celebrity migration from JSON to database...');

    // Connect to MongoDB
    await mongoConnection.connect();
    logger.info('✅ Connected to MongoDB');

    // Check if JSON file exists (it may have been removed after migration)
    const jsonPath = path.join(__dirname, '../../celebrities.json');
    logger.info(`📖 Checking for celebrities JSON file: ${jsonPath}`);

    try {
      await fs.access(jsonPath);
    } catch {
      logger.warn(
        '⚠️ celebrities.json file not found - it may have already been migrated and removed'
      );
      logger.info('💡 If you need to migrate celebrities, you can:');
      logger.info('   1. Use the admin API: POST /api/v1/admin/celebrities');
      logger.info('   2. Restore the JSON file temporarily and re-run this script');
      logger.info('   3. Check if celebrities are already in the database');

      // Check if celebrities already exist in database
      const stats = await celebrityService.getStatistics();
      if (stats.totalCelebrities > 0) {
        logger.info(`✅ Found ${stats.totalCelebrities} celebrities already in database`);
        logger.info('📊 Database statistics:');
        logger.info(`   - Active celebrities: ${stats.activeCelebrities}`);
        logger.info(`   - Categories: ${stats.categoriesBreakdown.length}`);
        stats.categoriesBreakdown.forEach((cat: { category: string; count: number }) => {
          logger.info(`   - ${cat.category}: ${cat.count} celebrities`);
        });
        logger.info('🎉 Migration appears to have been completed previously!');
        return;
      } else {
        throw new Error(
          '❌ No JSON file found and no celebrities in database. Please provide celebrities data.'
        );
      }
    }

    const jsonData = await fs.readFile(jsonPath, 'utf-8');
    const data: JsonCelebrityData = JSON.parse(jsonData);

    if (!data.celebrities || !Array.isArray(data.celebrities)) {
      throw new Error('❌ Invalid JSON format: celebrities must be an array');
    }

    logger.info(`📊 Found ${data.celebrities.length} celebrities in JSON file`);

    // Perform migration
    const result = await celebrityService.migrateFromJson(data.celebrities);

    // Display results
    logger.info('🎉 Migration completed!');
    logger.info(`✅ Created: ${result.created} celebrities`);
    logger.info(`⏭️  Skipped: ${result.skipped} celebrities (already exist)`);
    logger.info(`❌ Errors: ${result.errors.length} celebrities`);

    if (result.errors.length > 0) {
      logger.warn('⚠️  Migration errors:');
      result.errors.forEach(error => logger.warn(`   - ${error}`));
    }

    // Show statistics
    const stats = await celebrityService.getStatistics();
    logger.info('📈 Database statistics after migration:');
    logger.info(`   - Total celebrities: ${stats.totalCelebrities}`);
    logger.info(`   - Active celebrities: ${stats.activeCelebrities}`);
    logger.info(`   - Categories: ${stats.categoriesBreakdown.length}`);

    // Show category breakdown
    logger.info('📊 Category breakdown:');
    stats.categoriesBreakdown.forEach((cat: { category: string; count: number }) => {
      logger.info(`   - ${cat.category}: ${cat.count} celebrities`);
    });

    logger.info('🎯 Migration successful! You can now:');
    logger.info('   1. Test the new database-driven celebrity system');
    logger.info('   2. Remove the celebrities.json file');
    logger.info('   3. Update any remaining JSON-dependent code');
  } catch (error) {
    logger.error('💥 Migration failed:', error);
    process.exit(1);
  } finally {
    // Disconnect from MongoDB
    await mongoConnection.disconnect();
    logger.info('🔌 Disconnected from MongoDB');
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateCelebrities()
    .then(() => {
      logger.info('✨ Migration script completed successfully');
      process.exit(0);
    })
    .catch(error => {
      logger.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateCelebrities };
