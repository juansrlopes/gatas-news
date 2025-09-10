import { Article, IArticle } from '../models/Article';
import { FilterQuery, UpdateQuery } from 'mongoose';
import logger from '../../utils/logger';

export interface ArticleFilters {
  celebrity?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  source?: string;
  dateFrom?: Date;
  dateTo?: Date;
  isActive?: boolean;
  tags?: string[];
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ArticleSearchOptions extends PaginationOptions {
  searchTerm?: string;
}

export class ArticleRepository {
  private static instance: ArticleRepository;

  private constructor() {}

  public static getInstance(): ArticleRepository {
    if (!ArticleRepository.instance) {
      ArticleRepository.instance = new ArticleRepository();
    }
    return ArticleRepository.instance;
  }

  /**
   * Create a new article
   */
  public async create(articleData: Partial<IArticle>): Promise<IArticle> {
    try {
      const article = new Article(articleData);
      return await article.save();
    } catch (error) {
      logger.error('Error creating article:', error);
      throw error;
    }
  }

  /**
   * Create multiple articles (bulk insert)
   */
  public async createMany(articlesData: Partial<IArticle>[]): Promise<IArticle[]> {
    try {
      return await Article.insertMany(articlesData, { ordered: false });
    } catch (error) {
      logger.error('Error creating multiple articles:', error);
      throw error;
    }
  }

  /**
   * Find article by ID
   */
  public async findById(id: string): Promise<IArticle | null> {
    try {
      return await Article.findById(id).exec();
    } catch (error) {
      logger.error('Error finding article by ID:', error);
      throw error;
    }
  }

  /**
   * Find article by URL
   */
  public async findByUrl(url: string): Promise<IArticle | null> {
    try {
      return await Article.findOne({ url }).exec();
    } catch (error) {
      logger.error('Error finding article by URL:', error);
      throw error;
    }
  }

  /**
   * Find articles with filters and pagination
   */
  public async findWithFilters(
    filters: ArticleFilters = {},
    options: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<{
    articles: IArticle[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
    hasMore: boolean;
  }> {
    try {
      const query = this.buildFilterQuery(filters);
      const { page, limit, sortBy = 'publishedAt', sortOrder = 'desc' } = options;
      const skip = (page - 1) * limit;

      // Build sort object
      const sort: Record<string, 1 | -1> = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Execute queries in parallel
      const [articles, totalCount] = await Promise.all([
        Article.find(query).sort(sort).skip(skip).limit(limit).exec(),
        Article.countDocuments(query).exec(),
      ]);

      const totalPages = Math.ceil(totalCount / limit);
      const hasMore = page < totalPages;

      return {
        articles,
        totalCount,
        totalPages,
        currentPage: page,
        hasMore,
      };
    } catch (error) {
      logger.error('Error finding articles with filters:', error);
      throw error;
    }
  }

  /**
   * Search articles with text search
   */
  public async search(
    searchTerm: string,
    filters: ArticleFilters = {},
    options: ArticleSearchOptions = { page: 1, limit: 20 }
  ): Promise<{
    articles: IArticle[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
    hasMore: boolean;
  }> {
    try {
      const query = this.buildFilterQuery(filters);

      // Add text search
      if (searchTerm) {
        query.$text = { $search: searchTerm };
      }

      const { page, limit, sortBy = 'publishedAt', sortOrder = 'desc' } = options;
      const skip = (page - 1) * limit;

      // Build sort object
      const sort: Record<string, 1 | -1> = {};
      if (searchTerm) {
        (sort as Record<string, unknown>).score = { $meta: 'textScore' };
      }
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Execute queries in parallel
      const [articles, totalCount] = await Promise.all([
        Article.find(query).sort(sort).skip(skip).limit(limit).exec(),
        Article.countDocuments(query).exec(),
      ]);

      const totalPages = Math.ceil(totalCount / limit);
      const hasMore = page < totalPages;

      return {
        articles,
        totalCount,
        totalPages,
        currentPage: page,
        hasMore,
      };
    } catch (error) {
      logger.error('Error searching articles:', error);
      throw error;
    }
  }

  /**
   * Find articles by celebrity
   */
  public async findByCelebrity(
    celebrity: string,
    options: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<IArticle[]> {
    try {
      return await Article.findByCelebrity(celebrity, options.limit, options.page);
    } catch (error) {
      logger.error('Error finding articles by celebrity:', error);
      throw error;
    }
  }

  /**
   * Get recent articles
   */
  public async getRecent(limit: number = 20): Promise<IArticle[]> {
    try {
      return await Article.findRecent(limit);
    } catch (error) {
      logger.error('Error getting recent articles:', error);
      throw error;
    }
  }

  /**
   * Get popular articles
   */
  public async getPopular(limit: number = 10): Promise<IArticle[]> {
    try {
      return await Article.getPopularArticles(limit);
    } catch (error) {
      logger.error('Error getting popular articles:', error);
      throw error;
    }
  }

  /**
   * Update article
   */
  public async update(id: string, updateData: UpdateQuery<IArticle>): Promise<IArticle | null> {
    try {
      return await Article.findByIdAndUpdate(id, updateData, { new: true }).exec();
    } catch (error) {
      logger.error('Error updating article:', error);
      throw error;
    }
  }

  /**
   * Soft delete article (mark as inactive)
   */
  public async softDelete(id: string): Promise<IArticle | null> {
    try {
      return await Article.markAsInactive(id);
    } catch (error) {
      logger.error('Error soft deleting article:', error);
      throw error;
    }
  }

  /**
   * Hard delete article
   */
  public async delete(id: string): Promise<boolean> {
    try {
      const result = await Article.findByIdAndDelete(id).exec();
      return !!result;
    } catch (error) {
      logger.error('Error deleting article:', error);
      throw error;
    }
  }

  /**
   * Check if article exists by URL
   */
  public async existsByUrl(url: string): Promise<boolean> {
    try {
      // FRESH START FIX: Only check against active articles to avoid duplicate detection with backed-up articles
      const count = await Article.countDocuments({ url, isActive: true }).exec();
      return count > 0;
    } catch (error) {
      logger.error('Error checking article existence:', error);
      throw error;
    }
  }

  /**
   * Get articles count by filters
   */
  public async getCount(filters: ArticleFilters = {}): Promise<number> {
    try {
      const query = this.buildFilterQuery(filters);
      return await Article.countDocuments(query).exec();
    } catch (error) {
      logger.error('Error getting articles count:', error);
      throw error;
    }
  }

  /**
   * Get articles statistics
   */
  public async getStatistics(): Promise<{
    totalArticles: number;
    activeArticles: number;
    inactiveArticles: number;
    articlesByCelebrity: Array<{ celebrity: string; count: number }>;
    articlesBySentiment: Array<{ sentiment: string; count: number }>;
    recentArticlesCount: number;
  }> {
    try {
      const [
        totalArticles,
        activeArticles,
        inactiveArticles,
        articlesByCelebrity,
        articlesBySentiment,
        recentArticlesCount,
      ] = await Promise.all([
        Article.countDocuments().exec(),
        Article.countDocuments({ isActive: true }).exec(),
        Article.countDocuments({ isActive: false }).exec(),
        Article.aggregate([
          { $match: { isActive: true } },
          { $group: { _id: '$celebrity', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
          { $project: { celebrity: '$_id', count: 1, _id: 0 } },
        ]).exec(),
        Article.aggregate([
          { $match: { isActive: true } },
          { $group: { _id: '$sentiment', count: { $sum: 1 } } },
          { $project: { sentiment: '$_id', count: 1, _id: 0 } },
        ]).exec(),
        Article.countDocuments({
          isActive: true,
          publishedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        }).exec(),
      ]);

      return {
        totalArticles,
        activeArticles,
        inactiveArticles,
        articlesByCelebrity,
        articlesBySentiment,
        recentArticlesCount,
      };
    } catch (error) {
      logger.error('Error getting articles statistics:', error);
      throw error;
    }
  }

  /**
   * Build MongoDB filter query from filters object
   */
  private buildFilterQuery(filters: ArticleFilters): FilterQuery<IArticle> {
    const query: FilterQuery<IArticle> = {};

    // Default to active articles
    query.isActive = filters.isActive !== undefined ? filters.isActive : true;

    if (filters.celebrity) {
      query.celebrity = { $regex: filters.celebrity, $options: 'i' };
    }

    if (filters.sentiment) {
      query.sentiment = filters.sentiment;
    }

    if (filters.source) {
      query['source.name'] = { $regex: filters.source, $options: 'i' };
    }

    if (filters.dateFrom || filters.dateTo) {
      query.publishedAt = {};
      if (filters.dateFrom) {
        query.publishedAt.$gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        query.publishedAt.$lte = filters.dateTo;
      }
    }

    if (filters.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags };
    }

    return query;
  }
}

export const articleRepository = ArticleRepository.getInstance();
