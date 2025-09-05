import fs from 'fs/promises';
import path from 'path';
import { CelebrityList } from '../../../../libs/shared/types/src/index';
import { cacheService } from '../utils/cache';
import { NotFoundError } from '../types/errors';
import logger from '../utils/logger';

export class CelebrityService {
  private static instance: CelebrityService;
  private celebritiesFilePath: string;

  private constructor() {
    this.celebritiesFilePath = path.join(__dirname, '../../celebrities.json');
  }

  public static getInstance(): CelebrityService {
    if (!CelebrityService.instance) {
      CelebrityService.instance = new CelebrityService();
    }
    return CelebrityService.instance;
  }

  /**
   * Get all celebrities from cache or file
   */
  public async getCelebrities(): Promise<string[]> {
    const cacheKey = cacheService.generateCelebritiesKey();

    // Try to get from cache first
    const cachedCelebrities = cacheService.get<string[]>(cacheKey);
    if (cachedCelebrities) {
      logger.debug('Retrieved celebrities from cache');
      return cachedCelebrities;
    }

    try {
      // Read from file asynchronously
      const data = await fs.readFile(this.celebritiesFilePath, 'utf-8');
      const jsonData: CelebrityList = JSON.parse(data);
      const celebrities = jsonData.celebrities || [];

      if (celebrities.length === 0) {
        throw new NotFoundError('No celebrities found in the database');
      }

      // Cache the result for future requests
      cacheService.set(cacheKey, celebrities, 3600); // Cache for 1 hour

      logger.info(`Loaded ${celebrities.length} celebrities from file`);
      return celebrities;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }

      logger.error('Error reading celebrities file:', error);
      throw new Error('Failed to load celebrities database');
    }
  }

  /**
   * Get a specific celebrity by name (case-insensitive search)
   */
  public async findCelebrity(name: string): Promise<string | null> {
    const celebrities = await this.getCelebrities();
    const normalizedName = name.toLowerCase().trim();

    const found = celebrities.find(
      celebrity =>
        celebrity.toLowerCase().includes(normalizedName) ||
        normalizedName.includes(celebrity.toLowerCase())
    );

    return found || null;
  }

  /**
   * Get random celebrities for variety
   */
  public async getRandomCelebrities(count: number = 5): Promise<string[]> {
    const celebrities = await this.getCelebrities();

    if (celebrities.length <= count) {
      return celebrities;
    }

    const shuffled = [...celebrities].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  /**
   * Refresh the celebrities cache
   */
  public refreshCache(): void {
    const cacheKey = cacheService.generateCelebritiesKey();
    cacheService.del(cacheKey);
    logger.info('Celebrities cache refreshed');
  }
}

export const celebrityService = CelebrityService.getInstance();
