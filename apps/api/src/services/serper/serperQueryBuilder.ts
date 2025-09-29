/**
 * Serper Query Builder
 * 
 * Smart query construction for Brazilian celebrity news searches
 * Optimizes search queries for maximum relevant results
 */

import { SerperSearchOptions } from './serperTypes';
// Removed unused imports - using simplified query approach
import logger from '../../utils/logger';

export class SerperQueryBuilder {
  /**
   * Build optimized search query for a Brazilian celebrity
   */
  public static buildCelebrityQuery(celebrityName: string, options: {
    searchType?: 'comprehensive' | 'entertainment' | 'news' | 'lifestyle' | 'career';
    dateRestrict?: string;
    language?: string;
  } = {}): SerperSearchOptions {
    const {
      searchType = 'comprehensive',
      dateRestrict = 'm1' // Last month by default
    } = options;

    // Use EXACT format from Serper playground - just the celebrity name
    let query = celebrityName; // Just the name, no additional terms
    
    // For news endpoint, we don't need additional context terms
    // The /news endpoint already filters for news content

    // Keep it simple - avoid complex source filtering for now

    const searchOptions: SerperSearchOptions = {
      query,
      location: 'Brazil',       // Full country name as shown in playground
      language: 'pt-br',        // Full language code as shown in playground  
      num: 20,                  // Start with reasonable number
      dateRestrict,            // Recent articles
      sortBy: 'relevance',     // Most relevant first
    };

    logger.debug(`Built Serper query for ${celebrityName}:`, {
      query: searchOptions.query,
      searchType,
      options: searchOptions
    });

    return searchOptions;
  }

  /**
   * Build batch query for multiple celebrities
   */
  public static buildBatchQuery(celebrities: string[], options: {
    maxCelebritiesPerQuery?: number;
    searchType?: 'comprehensive' | 'entertainment' | 'news';
  } = {}): SerperSearchOptions[] {
    const {
      maxCelebritiesPerQuery = 10 // Maximum efficient batch size: 3.7 articles per call, 12 total calls
    } = options;

    const queries: SerperSearchOptions[] = [];

    // Split celebrities into batches
    for (let i = 0; i < celebrities.length; i += maxCelebritiesPerQuery) {
      const batch = celebrities.slice(i, i + maxCelebritiesPerQuery);
      
      // Create batch query for /news endpoint - just the names
      const celebrityQueries = batch.map(name => `"${name}"`).join(' OR ');
      
      let query = celebrityQueries; // Just the celebrity names, no additional terms

      queries.push({
        query,
        location: 'Brazil',      // Full country name
        language: 'pt-br',       // Full language code
        num: 20,                 // Reasonable number for batch
        dateRestrict: 'm1',
        sortBy: 'relevance',
        // Removed tbm parameter - using /news endpoint instead
      });
    }

    logger.info(`Built ${queries.length} batch queries for ${celebrities.length} celebrities`);
    return queries;
  }

  /**
   * Build trending search query
   */
  public static buildTrendingQuery(options: {
    category?: 'entertainment' | 'fashion' | 'music' | 'tv' | 'social';
    dateRestrict?: string;
  } = {}): SerperSearchOptions {
    const {
      category = 'entertainment',
      dateRestrict = 'd1' // Last day for trending
    } = options;

    const categoryTerms = {
      entertainment: 'entretenimento celebridades famosas brasil',
      fashion: 'moda fashion celebridades brasil',
      music: 'música cantoras artistas brasil',
      tv: 'televisão tv novela reality brasil',
      social: 'instagram redes sociais influencers brasil'
    };

    const query = `${categoryTerms[category]} site:br -"obituário" -"faleceu"`;

    return {
      query,
      location: 'br',
      language: 'pt',
      num: 50,
      dateRestrict,
      sortBy: 'date', // Most recent for trending
      // Removed tbm parameter - using /news endpoint instead
    };
  }

  /**
   * Build live search query (for real-time user searches)
   */
  public static buildLiveSearchQuery(searchTerm: string, options: {
    celebrity?: string;
    dateRestrict?: string;
  } = {}): SerperSearchOptions {
    const { celebrity, dateRestrict = 'w1' } = options;

    let query = searchTerm;

    // If celebrity is specified, combine with search term
    if (celebrity) {
      query = `"${celebrity}" ${searchTerm}`;
    }

    // Add Brazilian context and quality filters
    query = `${query} site:br (entretenimento OR notícias OR celebridade) -"obituário" -"faleceu"`;

    return {
      query,
      location: 'br',
      language: 'pt',
      num: 50,
      dateRestrict,
      sortBy: 'relevance',
      // Removed tbm parameter - using /news endpoint instead
    };
  }

  /**
   * Validate and sanitize query
   */
  public static sanitizeQuery(query: string): string {
    // Remove potentially problematic characters
    const sanitized = query
      .replace(/[<>]/g, '') // Remove HTML-like characters
      .replace(/[{}]/g, '') // Remove curly braces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Ensure query is not too long (Serper has limits)
    if (sanitized.length > 500) {
      logger.warn(`Query too long (${sanitized.length} chars), truncating`);
      return sanitized.substring(0, 500);
    }

    return sanitized;
  }

  /**
   * Estimate query cost (for rate limiting)
   */
  public static estimateQueryCost(options: SerperSearchOptions): number {
    // Base cost
    let cost = 1;

    // Higher cost for more results
    if (options.num && options.num > 50) {
      cost += 0.5;
    }

    // Higher cost for recent date restrictions (more processing)
    if (options.dateRestrict === 'd1') {
      cost += 0.3;
    }

    return cost;
  }
}

export default SerperQueryBuilder;
