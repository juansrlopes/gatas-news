import { Celebrity, ICelebrity } from '../models/Celebrity';
import { FilterQuery, UpdateQuery } from 'mongoose';
import logger from '../../utils/logger';

export interface CelebrityFilters {
  isActive?: boolean;
  hasArticles?: boolean;
}

export interface CelebritySearchOptions {
  page: number;
  limit: number;
  sortBy?: 'name' | 'totalArticles' | 'avgArticlesPerDay' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export class CelebrityRepository {
  private static instance: CelebrityRepository;

  private constructor() {}

  public static getInstance(): CelebrityRepository {
    if (!CelebrityRepository.instance) {
      CelebrityRepository.instance = new CelebrityRepository();
    }
    return CelebrityRepository.instance;
  }

  /**
   * Create a new celebrity
   */
  public async create(celebrityData: Partial<ICelebrity>): Promise<ICelebrity> {
    try {
      const celebrity = new Celebrity(celebrityData);
      return await celebrity.save();
    } catch (error) {
      logger.error('Error creating celebrity:', error);
      throw error;
    }
  }

  /**
   * Create multiple celebrities (bulk insert)
   */
  public async createMany(celebritiesData: Partial<ICelebrity>[]): Promise<ICelebrity[]> {
    try {
      return await Celebrity.insertMany(celebritiesData, { ordered: false });
    } catch (error) {
      logger.error('Error creating multiple celebrities:', error);
      throw error;
    }
  }

  /**
   * Find celebrity by ID
   */
  public async findById(id: string): Promise<ICelebrity | null> {
    try {
      return await Celebrity.findById(id).exec();
    } catch (error) {
      logger.error('Error finding celebrity by ID:', error);
      throw error;
    }
  }

  /**
   * Find celebrity by name (exact match)
   */
  public async findByName(name: string): Promise<ICelebrity | null> {
    try {
      return await Celebrity.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        isActive: true,
      }).exec();
    } catch (error) {
      logger.error('Error finding celebrity by name:', error);
      throw error;
    }
  }

  /**
   * Find celebrity by slug
   */
  public async findBySlug(slug: string): Promise<ICelebrity | null> {
    try {
      return await Celebrity.findOne({ slug, isActive: true }).exec();
    } catch (error) {
      logger.error('Error finding celebrity by slug:', error);
      throw error;
    }
  }

  /**
   * Search celebrities by name, aliases, or search terms
   */
  public async search(
    query: string,
    options: CelebritySearchOptions = { page: 1, limit: 20 }
  ): Promise<{
    celebrities: ICelebrity[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
    hasMore: boolean;
  }> {
    try {
      const { page, limit, sortBy = 'name', sortOrder = 'asc' } = options;
      const skip = (page - 1) * limit;

      // Build search query
      const searchRegex = new RegExp(query, 'i');
      const searchQuery: FilterQuery<ICelebrity> = {
        isActive: true,
        $or: [
          { name: searchRegex },
          { aliases: { $in: [searchRegex] } },
          { searchTerms: { $in: [searchRegex] } },
        ],
      };

      // Build sort object
      const sort: Record<string, 1 | -1> = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Execute queries in parallel
      const [celebrities, totalCount] = await Promise.all([
        Celebrity.find(searchQuery).sort(sort).skip(skip).limit(limit).exec(),
        Celebrity.countDocuments(searchQuery).exec(),
      ]);

      const totalPages = Math.ceil(totalCount / limit);
      const hasMore = page < totalPages;

      return {
        celebrities,
        totalCount,
        totalPages,
        currentPage: page,
        hasMore,
      };
    } catch (error) {
      logger.error('Error searching celebrities:', error);
      throw error;
    }
  }

  /**
   * Find celebrities with filters and pagination
   */
  public async findWithFilters(
    filters: CelebrityFilters = {},
    options: CelebritySearchOptions = { page: 1, limit: 20 }
  ): Promise<{
    celebrities: ICelebrity[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
    hasMore: boolean;
  }> {
    try {
      const query = this.buildFilterQuery(filters);
      const { page, limit, sortBy = 'name', sortOrder = 'asc' } = options;
      const skip = (page - 1) * limit;

      // Build sort object
      const sort: Record<string, 1 | -1> = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Execute queries in parallel
      const [celebrities, totalCount] = await Promise.all([
        Celebrity.find(query).sort(sort).skip(skip).limit(limit).exec(),
        Celebrity.countDocuments(query).exec(),
      ]);

      const totalPages = Math.ceil(totalCount / limit);
      const hasMore = page < totalPages;

      return {
        celebrities,
        totalCount,
        totalPages,
        currentPage: page,
        hasMore,
      };
    } catch (error) {
      logger.error('Error finding celebrities with filters:', error);
      throw error;
    }
  }

  /**
   * Get all active celebrities for news fetching
   */
  public async getActiveForFetching(): Promise<ICelebrity[]> {
    try {
      return await Celebrity.findActive();
    } catch (error) {
      logger.error('Error getting active celebrities for fetching:', error);
      throw error;
    }
  }

  /**
   * Get top performing celebrities (by article count)
   */
  public async getTopPerformers(limit: number = 10): Promise<ICelebrity[]> {
    try {
      return await Celebrity.find({ isActive: true })
        .sort({ totalArticles: -1, avgArticlesPerDay: -1 })
        .limit(limit)
        .exec();
    } catch (error) {
      logger.error('Error getting top performing celebrities:', error);
      throw error;
    }
  }

  /**
   * Update celebrity
   */
  public async update(id: string, updateData: UpdateQuery<ICelebrity>): Promise<ICelebrity | null> {
    try {
      return await Celebrity.findByIdAndUpdate(id, updateData, { new: true }).exec();
    } catch (error) {
      logger.error('Error updating celebrity:', error);
      throw error;
    }
  }

  /**
   * Update celebrity article statistics
   */
  public async updateArticleStats(
    celebrityId: string,
    articleCount: number
  ): Promise<ICelebrity | null> {
    try {
      return await Celebrity.updateArticleStats(celebrityId, articleCount);
    } catch (error) {
      logger.error('Error updating celebrity article stats:', error);
      throw error;
    }
  }

  /**
   * Soft delete celebrity (mark as inactive)
   */
  public async softDelete(id: string): Promise<ICelebrity | null> {
    try {
      return await Celebrity.findByIdAndUpdate(id, { isActive: false }, { new: true }).exec();
    } catch (error) {
      logger.error('Error soft deleting celebrity:', error);
      throw error;
    }
  }

  /**
   * Hard delete celebrity
   */
  public async delete(id: string): Promise<boolean> {
    try {
      const result = await Celebrity.findByIdAndDelete(id).exec();
      return !!result;
    } catch (error) {
      logger.error('Error deleting celebrity:', error);
      throw error;
    }
  }

  /**
   * Check if celebrity exists by name
   */
  public async existsByName(name: string): Promise<boolean> {
    try {
      const count = await Celebrity.countDocuments({
        name: { $regex: new RegExp(`^${name}$`, 'i') },
      }).exec();
      return count > 0;
    } catch (error) {
      logger.error('Error checking celebrity existence:', error);
      throw error;
    }
  }

  /**
   * Get celebrities count by filters
   */
  public async getCount(filters: CelebrityFilters = {}): Promise<number> {
    try {
      const query = this.buildFilterQuery(filters);
      return await Celebrity.countDocuments(query).exec();
    } catch (error) {
      logger.error('Error getting celebrities count:', error);
      throw error;
    }
  }

  /**
   * Get celebrity statistics
   */
  public async getStatistics(): Promise<{
    totalCelebrities: number;
    activeCelebrities: number;
    inactiveCelebrities: number;
    topPerformers: ICelebrity[];
    recentlyAdded: ICelebrity[];
  }> {
    try {
      const [
        totalCelebrities,
        activeCelebrities,
        inactiveCelebrities,
        topPerformers,
        recentlyAdded,
      ] = await Promise.all([
        Celebrity.countDocuments().exec(),
        Celebrity.countDocuments({ isActive: true }).exec(),
        Celebrity.countDocuments({ isActive: false }).exec(),
        this.getTopPerformers(5),
        Celebrity.find({ isActive: true }).sort({ createdAt: -1 }).limit(5).exec(),
      ]);

      return {
        totalCelebrities,
        activeCelebrities,
        inactiveCelebrities,
        topPerformers,
        recentlyAdded,
      };
    } catch (error) {
      logger.error('Error getting celebrity statistics:', error);
      throw error;
    }
  }

  /**
   * Migrate from JSON file to database
   */
  public async migrateFromJson(celebrities: string[]): Promise<{
    created: number;
    skipped: number;
    errors: string[];
  }> {
    const result = {
      created: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const name of celebrities) {
      try {
        const exists = await this.existsByName(name);
        if (exists) {
          result.skipped++;
          continue;
        }

        await this.create({
          name: name.trim(),
          slug: name
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-*|-*$/g, ''),
          aliases: [name.trim().toLowerCase()],
          isActive: true,
        });

        result.created++;
      } catch (error) {
        result.errors.push(`Failed to create ${name}: ${(error as Error).message}`);
      }
    }

    return result;
  }

  /**
   * Build MongoDB filter query from filters object
   */
  private buildFilterQuery(filters: CelebrityFilters): FilterQuery<ICelebrity> {
    const query: FilterQuery<ICelebrity> = {};

    // Default to active celebrities
    query.isActive = filters.isActive !== undefined ? filters.isActive : true;

    if (filters.hasArticles) {
      query.totalArticles = { $gt: 0 };
    }

    return query;
  }
}

export const celebrityRepository = CelebrityRepository.getInstance();
