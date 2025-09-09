/**
 * CRITICAL: Automatic Celebrity Backup System
 *
 * Automatically backs up celebrity data to prevent business-critical data loss
 */

import fs from 'fs';
import path from 'path';
import { Celebrity } from '../database/models/Celebrity';
import logger from './logger';

const BACKUP_DIR = path.join(__dirname, '../../backups');
const BACKUP_FILE = path.join(BACKUP_DIR, 'celebrities-auto-backup.json');
const DAILY_BACKUP_FILE = path.join(
  BACKUP_DIR,
  `celebrities-${new Date().toISOString().split('T')[0]}.json`
);

/**
 * Ensure backup directory exists
 */
const ensureBackupDir = (): void => {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    logger.info('📁 Created backup directory:', BACKUP_DIR);
  }
};

/**
 * Create automatic backup of all celebrities
 */
export const createAutomaticBackup = async (): Promise<void> => {
  try {
    ensureBackupDir();

    const celebrities = await Celebrity.find({}).lean();
    const backupData = {
      timestamp: new Date().toISOString(),
      count: celebrities.length,
      celebrities: celebrities,
    };

    // Write main backup file
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(backupData, null, 2));

    // Write daily backup file
    fs.writeFileSync(DAILY_BACKUP_FILE, JSON.stringify(backupData, null, 2));

    logger.info(`💾 Celebrity backup created: ${celebrities.length} celebrities backed up`);
    logger.info(`💾 Backup files: ${BACKUP_FILE} and ${DAILY_BACKUP_FILE}`);
  } catch (error) {
    logger.error('🚨 CRITICAL: Failed to create celebrity backup:', error);
    throw error;
  }
};

/**
 * Restore celebrities from backup
 */
export const restoreFromBackup = async (backupFile?: string): Promise<number> => {
  try {
    const fileToRestore = backupFile || BACKUP_FILE;

    if (!fs.existsSync(fileToRestore)) {
      throw new Error(`Backup file not found: ${fileToRestore}`);
    }

    const backupData = JSON.parse(fs.readFileSync(fileToRestore, 'utf8'));
    const celebrities = backupData.celebrities;

    logger.info(`🔄 Restoring ${celebrities.length} celebrities from backup...`);

    // Clear existing celebrities (dangerous but necessary for restore)
    await Celebrity.deleteMany({});

    // Insert backed up celebrities
    await Celebrity.insertMany(celebrities);

    const restoredCount = await Celebrity.countDocuments();
    logger.info(`✅ Restored ${restoredCount} celebrities from backup`);

    return restoredCount;
  } catch (error) {
    logger.error('🚨 CRITICAL: Failed to restore celebrities from backup:', error);
    throw error;
  }
};

/**
 * Verify backup integrity
 */
export const verifyBackupIntegrity = async (): Promise<boolean> => {
  try {
    if (!fs.existsSync(BACKUP_FILE)) {
      logger.warn('⚠️ No automatic backup file found');
      return false;
    }

    const backupData = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8'));
    const backupCount = backupData.celebrities?.length || 0;
    const currentCount = await Celebrity.countDocuments();

    if (backupCount === 0) {
      logger.error('🚨 Backup file is empty or corrupted');
      return false;
    }

    if (currentCount < backupCount * 0.5) {
      logger.error(
        `🚨 CRITICAL DATA LOSS DETECTED: Current: ${currentCount}, Backup: ${backupCount}`
      );
      return false;
    }

    logger.info(`✅ Backup integrity verified: Current: ${currentCount}, Backup: ${backupCount}`);
    return true;
  } catch (error) {
    logger.error('Error verifying backup integrity:', error);
    return false;
  }
};

/**
 * Schedule automatic backups
 */
export const scheduleAutomaticBackups = (): void => {
  // Create backup every hour
  setInterval(
    async () => {
      try {
        await createAutomaticBackup();
      } catch (error) {
        logger.error('Scheduled backup failed:', error);
      }
    },
    60 * 60 * 1000
  ); // 1 hour

  logger.info('⏰ Automatic celebrity backups scheduled every hour');
};
