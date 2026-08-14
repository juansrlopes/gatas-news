/**
 * Serper Controller
 * 
 * Admin endpoints for testing and managing Serper integration
 */

import { Request, Response } from 'express';
import axios from 'axios';
import { asyncHandler } from '../middleware/errorHandler';
import { serperService } from '../services/serper/serperService';
import SerperQueryBuilder from '../services/serper/serperQueryBuilder';
import { SerperArticle } from '../services/serper/serperTypes';
import { APIResponse } from '../../../../libs/shared/types/src/index';
import logger from '../utils/logger';

const SERPER_NEWS_URL = 'https://google.serper.dev/news';

interface BatchTestResult {
  batchSize: number;
  success: boolean;
  efficiency: number;
  apiCallsFor112Celebrities: number;
  error?: string;
}

export class SerperController {
  /**
   * GET /api/v1/admin/serper/test
   * Test Serper API with a sample celebrity search
   */
  public static testSerperApi = asyncHandler(async (req: Request, res: Response<APIResponse<unknown>>): Promise<void> => {
    const { celebrity = 'Anitta', limit = 5 } = req.query;

    logger.info('Testing Serper API', { celebrity, limit, ip: req.ip });

    const keyUsed = await serperService.getKeyForRequest();
    const keyPrefixUsed = keyUsed ? `${keyUsed.substring(0, 8)}...` : null;

    try {
      const result = await serperService.searchCelebrity(celebrity as string, {
        searchType: 'comprehensive',
        limit: Number(limit),
        dateRestrict: 'w1' // Last week
      });

      res.json({
        success: true,
        message: `Serper API test completed for ${celebrity}`,
        data: {
          keyPrefixUsed,
          celebrity,
          articlesFound: result.length,
          articles: result.map(article => ({
            title: article.title,
            source: article.source.name,
            publishedAt: article.publishedAt,
            url: article.url,
            hasImage: !!article.imageUrl,
          })),
          sampleTitles: result.slice(0, 3).map(a => a.title),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      const status = (err as { response?: { status?: number }; status?: number })?.response?.status ?? (err as { status?: number })?.status;
      res.status(200).json({
        success: false,
        message: 'Serper test failed',
        data: {
          keyPrefixUsed,
          error: message,
          serperStatus: status,
          hint: keyPrefixUsed
            ? 'Compare keyPrefixUsed with npm run validateKeys (key 1). If they match and validateKeys works, env/request may differ.'
            : 'No key loaded. Check apps/api/.env and SERPER_API_KEY.',
        },
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * GET /api/v1/admin/serper/batch-test
   * Test batch search with multiple celebrities
   */
  public static testBatchSearch = asyncHandler(async (req: Request, res: Response<APIResponse<unknown>>): Promise<void> => {
    const celebrities = ['Anitta', 'Bruna Marquezine', 'Gabi Martins'];
    
    logger.info('Testing Serper batch search', { celebrities, ip: req.ip });

    const result = await serperService.searchMultipleCelebrities(celebrities, {
      searchType: 'comprehensive',
      articlesPerCelebrity: 5
    });

    // Group results by celebrity
    const groupedResults = celebrities.reduce((acc, celebrity) => {
      acc[celebrity] = result.filter(article => 
        article.celebrity === celebrity || 
        article.title.toLowerCase().includes(celebrity.toLowerCase())
      );
      return acc;
    }, {} as Record<string, typeof result>);

    res.json({
      success: true,
      message: `Serper batch test completed for ${celebrities.length} celebrities`,
      data: {
        totalArticles: result.length,
        celebrityBreakdown: Object.entries(groupedResults).map(([celebrity, articles]) => ({
          celebrity,
          articleCount: articles.length,
          sampleTitles: articles.slice(0, 2).map(a => a.title),
        })),
        allArticles: result.map(article => ({
          title: article.title,
          celebrity: article.celebrity,
          source: article.source.name,
          publishedAt: article.publishedAt,
        })),
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /api/v1/admin/serper/batch-query-test?size=10
   * TRUE BATCH TEST: One Serper request with N names in the query (saves credits).
   * Use this to find max names per request. apiCallsMade should always be 1.
   */
  public static batchQueryTest = asyncHandler(async (req: Request, res: Response<APIResponse<unknown>>): Promise<void> => {
    const size = Math.min(Math.max(1, Number(req.query.size) || 10), 50);
    const testCelebrities = [
      'Anitta', 'Bruna Marquezine', 'Gabi Martins', 'Jade Picon', 'Luisa Sonza',
      'Grazi Massafera', 'Paolla Oliveira', 'Isis Valverde', 'Marina Ruy Barbosa', 'Juliana Paes',
      'Deborah Secco', 'Flávia Saraiva', 'Fernanda Valença', 'Mendigata', 'Fernanda Lacerda',
      'Viviane Araújo', 'Mariana Ximenes', 'Lara Jucá', 'Maitê Sasdelli', 'Fernanda Campos',
      'Andressa Urach', 'Giulia Rosa', 'Clara Dalcol', 'Martina Oliveira', 'Jéssica Beatriz Costa',
      'Geisy Arruda', 'Nicole Bahls', 'Vanusa Freitas', 'Yasmin Brunet', 'Monique Rizzeto',
      'Bruna Griphao', 'Larissa Santos', 'Juliette', 'Juju Salimeni', 'Carla Prata',
      'Iza', 'Mulher Melão', 'MC Mirella', 'Melody', 'MC Melody', 'Virginia Fonseca',
      'Alinne Rosa', 'Vivi Winkler', 'Luiza Caldi', 'Kamila Simioni', 'Ludmila',
      'Brunna Gonçalves', 'Rafa Kalimann', 'Andrea de Andrade', 'Mel Maia', 'Giovanna Jacobina',
    ];
    const celebrities = testCelebrities.slice(0, size);
    const queryString = celebrities.map(name => `"${name}"`).join(' OR ');
    const queryLength = queryString.length;

    logger.info(`Batch-query-test: 1 request with ${size} names (query length ${queryLength})`, { ip: req.ip });

    try {
      const startTime = Date.now();
      const result = await serperService.searchMultipleCelebrities(celebrities, {
        searchType: 'comprehensive',
        useIndividualSearches: false,
        maxCelebritiesPerQuery: size,
        articlesPerCelebrity: 100,
      });
      const duration = Date.now() - startTime;
      const articles = Array.isArray(result) ? result : (result as unknown as SerperArticle[]);
      const rawWhenEmpty = (result as unknown as { rawWhenEmpty?: { request: unknown; response: unknown; responseKeys: string[]; at: string } }).rawWhenEmpty ?? serperService.getLastRawWhenEmpty();

      const byCelebrity = celebrities.reduce((acc, name) => {
        acc[name] = articles.filter(a => (a.celebrity || '').toLowerCase().includes(name.toLowerCase()) || (a.title || '').toLowerCase().includes(name.toLowerCase())).length;
        return acc;
      }, {} as Record<string, number>);
      res.json({
        success: true,
        message: `One Serper request with ${size} names: ${articles.length} articles`,
        data: {
          namesInQuery: size,
          apiCallsMade: 1,
          queryLength,
          articlesReturned: articles.length,
          articlesPerCelebrity: Math.round((articles.length / size) * 100) / 100,
          durationMs: duration,
          celebritiesQueried: celebrities,
          breakdownByCelebrity: byCelebrity,
          sampleTitles: articles.slice(0, 5).map(a => ({ title: a.title, celebrity: a.celebrity })),
          for112Celebrities: `Would need ${Math.ceil(112 / size)} API calls (vs 112 individual)`,
          ...(articles.length === 0 && {
            debugHint: 'Check API logs for [SERPER_RAW_0] or see rawSerperResponse below.',
            rawSerperResponse: rawWhenEmpty ?? undefined,
          }),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error(`Batch-query-test size ${size} failed:`, error);
      res.status(500).json({
        success: false,
        message: `Batch query with ${size} names failed`,
        data: {
          namesInQuery: size,
          queryLength,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * GET /api/v1/admin/serper/debug-last-raw
   * Return last Serper request/response when 0 articles (for batch-query investigation).
   * Call batch-query-test first, then this.
   */
  public static getDebugLastRaw = asyncHandler(async (req: Request, res: Response<APIResponse<unknown>>): Promise<void> => {
    const raw = serperService.getLastRawWhenEmpty();
    if (!raw) {
      res.json({
        success: true,
        message: 'No 0-article response captured yet. Call GET /api/v1/admin/serper/batch-query-test?size=5 first.',
        data: null,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    res.json({
      success: true,
      message: 'Last raw Serper request/response when 0 articles were returned',
      data: raw,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /api/v1/admin/serper/raw-batch-test?size=5
   * One raw POST to Serper with a batch query (N names). Returns exact request + response.
   * Uses the same API key as the service (getKeyForRequest) so diagnostics match real fetches.
   */
  public static rawBatchTest = asyncHandler(async (req: Request, res: Response<APIResponse<unknown>>): Promise<void> => {
    const size = Math.min(Math.max(1, Number(req.query.size) || 5), 20);
    const names = [
      'Anitta', 'Bruna Marquezine', 'Gabi Martins', 'Jade Picon', 'Luisa Sonza',
      'Grazi Massafera', 'Paolla Oliveira', 'Isis Valverde', 'Marina Ruy Barbosa', 'Juliana Paes',
      'Deborah Secco', 'Flávia Saraiva', 'Fernanda Valença', 'Mendigata', 'Fernanda Lacerda',
      'Viviane Araújo', 'Mariana Ximenes', 'Lara Jucá', 'Maitê Sasdelli', 'Fernanda Campos',
    ].slice(0, size);
    // Use same request body as serperService.executeSearch (buildBatchQuery + sanitize, num from options)
    const queries = SerperQueryBuilder.buildBatchQuery(names, { maxCelebritiesPerQuery: size });
    const firstQuery = queries[0];
    const requestBody = {
      q: SerperQueryBuilder.sanitizeQuery(firstQuery.query),
      gl: 'br',
      hl: 'pt',
      num: firstQuery.num ?? 100,
    };

    // Use same key resolution as serperService so raw-batch-test and batch-query-test behave identically
    const apiKey = await serperService.getKeyForRequest();
    if (!apiKey) {
      res.status(500).json({
        success: false,
        message: 'No Serper API key. Set SERPER_API_KEY in apps/api/.env and restart the API.',
        data: { request: requestBody },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    logger.info('Raw batch test: one POST to Serper', { size, queryLength: requestBody.q.length, keyPrefix: apiKey.slice(0, 8) + '...', ip: req.ip });

    const tryRequest = async (headers: Record<string, string>) => {
      return axios.post(SERPER_NEWS_URL, requestBody, {
        headers: { ...headers, 'Content-Type': 'application/json' },
        timeout: 15000,
      });
    };

    try {
      const response = await tryRequest({ 'X-API-KEY': apiKey });
      res.json({
        success: true,
        message: 'Raw Serper batch request + response (see data.request and data.response)',
        data: {
          request: requestBody,
          response: {
            status: response.status,
            data: response.data,
            dataKeys: response.data ? Object.keys(response.data) : [],
            newsLength: Array.isArray(response.data?.news) ? response.data.news.length : 'N/A',
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        // On 403, optionally retry with Bearer (only if we haven't already)
        if (status === 403) {
          try {
            const retry = await tryRequest({ Authorization: `Bearer ${apiKey}` });
            res.json({
              success: true,
              message: 'Raw Serper batch: 403 with X-API-KEY; retry with Bearer succeeded',
              data: {
                request: requestBody,
                response: {
                  status: retry.status,
                  data: retry.data,
                  dataKeys: retry.data ? Object.keys(retry.data) : [],
                  newsLength: Array.isArray(retry.data?.news) ? retry.data.news.length : 'N/A',
                },
              },
              timestamp: new Date().toISOString(),
            });
            return;
          } catch (bearerErr) {
            const bearerStatus = axios.isAxiosError(bearerErr) ? bearerErr.response?.status : undefined;
            res.json({
              success: true,
              message: 'Serper returned 403 for both X-API-KEY and Authorization: Bearer. Check SERPER_API_KEY at serper.dev.',
              data: {
                request: requestBody,
                tried: ['X-API-KEY', 'Authorization: Bearer'],
                error: {
                  status: err.response?.status,
                  statusText: err.response?.statusText,
                  data: err.response?.data,
                },
                bearerRetryStatus: bearerStatus,
              },
              timestamp: new Date().toISOString(),
            });
            return;
          }
        }
        res.json({
          success: true,
          message: 'Raw Serper batch request failed (see data.request and data.error)',
          data: {
            request: requestBody,
            error: {
              status: err.response?.status,
              statusText: err.response?.statusText,
              data: err.response?.data,
            },
          },
          timestamp: new Date().toISOString(),
        });
      } else {
        throw err;
      }
    }
  });

  /**
   * GET /api/v1/admin/serper/batch-size-test
   * Test different batch sizes to find optimal configuration
   */
  public static testBatchSizes = asyncHandler(async (req: Request, res: Response<APIResponse<unknown>>): Promise<void> => {
    logger.info('Starting comprehensive batch size testing', { ip: req.ip });

    const testSizes = [10];
    const testCelebrities = ['Anitta', 'Bruna Marquezine', 'Gabi Martins', 'Jade Picon', 'Luisa Sonza', 
                            'Grazi Massafera', 'Paolla Oliveira', 'Isis Valverde', 'Marina Ruy Barbosa', 'Juliana Paes'];
    
    const results = [];
    
    for (const batchSize of testSizes) {
      const celebrities = testCelebrities.slice(0, batchSize);
      
      try {
        logger.info(`Testing batch size ${batchSize} with celebrities: ${celebrities.join(', ')}`);
        
        const startTime = Date.now();
        const articles = await serperService.searchMultipleCelebrities(celebrities, {
          searchType: 'comprehensive',
          articlesPerCelebrity: 5
        });
        const duration = Date.now() - startTime;
        
        const result = {
          batchSize,
          celebrities,
          articlesReturned: articles.length,
          articlesPerCelebrity: Math.round(articles.length / batchSize * 100) / 100,
          duration,
          efficiency: Math.round((articles.length / batchSize) * 100) / 100, // Articles per API call
          apiCallsFor112Celebrities: Math.ceil(112 / batchSize),
          success: true,
          sampleTitles: articles.slice(0, 3).map(a => a.title)
        };
        
        results.push(result);
        logger.info(`✅ Batch size ${batchSize}: ${articles.length} articles, efficiency: ${result.efficiency}`);
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        logger.error(`❌ Batch size ${batchSize} failed:`, error);
        results.push({
          batchSize,
          celebrities,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    // Find the best batch size
    const successfulResults = results.filter(r => r.success) as BatchTestResult[];
    const bestResult = successfulResults.length > 0 
      ? successfulResults.sort((a, b) => b.efficiency - a.efficiency)[0]
      : null;

    res.json({
      success: true,
      message: `Batch size testing completed. Tested ${testSizes.length} different batch sizes.`,
      data: {
        results,
        summary: {
          totalTests: testSizes.length,
          successfulTests: successfulResults.length,
          bestBatchSize: bestResult?.batchSize,
          bestEfficiency: bestResult?.efficiency,
          recommendedApiCalls: bestResult?.apiCallsFor112Celebrities,
        },
        recommendation: bestResult 
          ? `Use batch size ${bestResult.batchSize} for optimal efficiency (${bestResult.efficiency} articles per API call, ${bestResult.apiCallsFor112Celebrities} total calls for all celebrities)`
          : 'No successful batch sizes found. Consider using individual searches.',
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /api/v1/admin/serper/live-search
   * Test live search functionality
   */
  public static testLiveSearch = asyncHandler(async (req: Request, res: Response<APIResponse<unknown>>): Promise<void> => {
    const { q: searchTerm = 'celebridades brasileiras', celebrity, limit = 10 } = req.query;

    logger.info('Testing Serper live search', { searchTerm, celebrity, limit, ip: req.ip });

    const result = await serperService.liveSearch(searchTerm as string, {
      celebrity: celebrity as string,
      limit: Number(limit),
    });

    res.json({
      success: true,
      message: `Serper live search completed`,
      data: {
        searchTerm,
        celebrity: celebrity || 'all',
        articlesFound: result.length,
        articles: result.map(article => ({
          title: article.title,
          source: article.source.name,
          publishedAt: article.publishedAt,
          url: article.url,
        })),
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /api/v1/admin/serper/trending
   * Test trending news functionality
   */
  public static testTrendingNews = asyncHandler(async (req: Request, res: Response<APIResponse<unknown>>): Promise<void> => {
    const { category = 'entertainment', limit = 10 } = req.query;

    logger.info('Testing Serper trending news', { category, limit, ip: req.ip });

    const result = await serperService.getTrendingNews({
      category: category as 'entertainment' | 'fashion' | 'music' | 'tv' | 'social',
      limit: Number(limit),
    });

    res.json({
      success: true,
      message: `Serper trending news completed`,
      data: {
        category,
        articlesFound: result.length,
        articles: result.map(article => ({
          title: article.title,
          source: article.source.name,
          publishedAt: article.publishedAt,
          url: article.url,
        })),
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /api/v1/admin/serper/ping
   * Exact same request as npm run validateKeys (q: 'test') to verify key works from API process.
   */
  public static serperPing = asyncHandler(async (req: Request, res: Response<APIResponse<unknown>>): Promise<void> => {
    const apiKey = await serperService.getKeyForRequest();
    if (!apiKey) {
      res.status(200).json({
        success: false,
        message: 'No Serper key loaded',
        data: { hint: 'Set SERPER_API_KEY in apps/api/.env' },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    const keyPrefixUsed = `${apiKey.substring(0, 8)}...`;
    const body = { q: 'test', gl: 'br', hl: 'pt', num: 1 };
    const doPing = (authHeader: Record<string, string>) =>
      axios.post('https://google.serper.dev/search', body, {
        headers: {
          ...authHeader,
          'Content-Type': 'application/json',
          'User-Agent': 'Gatas-News-KeyTester/1.0',
        },
        timeout: 10000,
      });
    try {
      let response;
      try {
        response = await doPing({ Authorization: `Bearer ${apiKey}` });
      } catch (firstErr) {
        if (axios.isAxiosError(firstErr) && firstErr.response?.status === 403) {
          try {
            response = await doPing({ 'X-API-KEY': apiKey });
          } catch (xKeyErr) {
            res.status(200).json({
              success: false,
              message: 'Serper ping failed (403 with both Bearer and X-API-KEY)',
              data: {
                keyPrefixUsed,
                error: xKeyErr instanceof Error ? xKeyErr.message : String(xKeyErr),
                status: axios.isAxiosError(xKeyErr) ? xKeyErr.response?.status : undefined,
                hint: 'Key works in validateKeys but 403 from API – possible IP or server-side restriction',
              },
              timestamp: new Date().toISOString(),
            });
            return;
          }
        } else {
          throw firstErr;
        }
      }
      if (!response) return;
      res.json({
        success: true,
        message: 'Serper ping OK (same request as validateKeys)',
        data: {
          keyPrefixUsed,
          status: response.status,
          organicCount: response.data?.organic?.length ?? 0,
          newsCount: response.data?.news?.length ?? 0,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err: unknown) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      const message = err instanceof Error ? err.message : String(err);
      res.status(200).json({
        success: false,
        message: 'Serper ping failed',
        data: {
          keyPrefixUsed,
          error: message,
          status,
          hint: status === 403 ? 'Key works in validateKeys but 403 from API – check IP or try Authorization: Bearer' : undefined,
        },
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * GET /api/v1/admin/serper/validate-key
   * Validate Serper API key
   */
  public static validateApiKey = asyncHandler(async (req: Request, res: Response<APIResponse<unknown>>): Promise<void> => {
    const { apiKey } = req.query;

    if (!apiKey) {
    res.status(400).json({
      success: false,
      message: 'API key is required',
      data: null,
      timestamp: new Date().toISOString(),
    });
      return;
    }

    logger.info('Validating Serper API key', { ip: req.ip });

    const result = await serperService.validateApiKey(apiKey as string);

    res.json({
      success: result.isValid,
      message: result.isValid ? 'API key is valid' : 'API key is invalid',
      data: result,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /api/v1/admin/serper/compare
   * Compare Serper vs NewsAPI results for the same celebrity
   */
  public static compareWithNewsApi = asyncHandler(async (req: Request, res: Response<APIResponse<unknown>>): Promise<void> => {
    const { celebrity = 'Anitta' } = req.query;

    logger.info('Comparing Serper vs NewsAPI', { celebrity, ip: req.ip });

    try {
      // Get Serper results
      const serperResults = await serperService.searchCelebrity(celebrity as string, {
        searchType: 'comprehensive',
        limit: 10,
      });

      // TODO: Get NewsAPI results for comparison (when we still have it)
      // For now, just return Serper results with analysis

      const analysis = {
        serper: {
          totalArticles: serperResults.length,
          sources: [...new Set(serperResults.map(a => a.source.name))],
          hasImages: serperResults.filter(a => a.imageUrl).length,
          averageTitleLength: Math.round(
            serperResults.reduce((sum, a) => sum + a.title.length, 0) / serperResults.length
          ),
          sampleTitles: serperResults.slice(0, 3).map(a => a.title),
        },
        newsapi: {
          note: 'NewsAPI comparison will be available during parallel testing phase',
        },
      };

      res.json({
        success: true,
        message: `Comparison completed for ${celebrity}`,
        data: {
          celebrity,
          analysis,
          recommendation: serperResults.length > 5 
            ? 'Serper shows good results for this celebrity' 
            : 'Limited results - may need query optimization',
        },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      logger.error('Comparison failed:', error);
      res.status(500).json({
        success: false,
        message: 'Comparison failed',
        data: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * GET /api/v1/admin/serper/max-batch-test
   * Find the MAXIMUM batch size that Serper can handle
   */
  public static testMaximumBatchSize = asyncHandler(async (req: Request, res: Response<APIResponse<unknown>>): Promise<void> => {
    logger.info('🚨 CRITICAL: Testing MAXIMUM batch sizes for Serper', { ip: req.ip });

    // Test progressively larger batch sizes to find the absolute maximum
    const testSizes = [15, 20, 25, 30, 40, 50, 75, 100];
    const allCelebrities = [
      'Anitta', 'Bruna Marquezine', 'Gabi Martins', 'Jade Picon', 'Luisa Sonza',
      'Grazi Massafera', 'Paolla Oliveira', 'Isis Valverde', 'Marina Ruy Barbosa', 'Juliana Paes',
      'Deborah Secco', 'Flávia Saraiva', 'Fernanda Valença', 'Mendigata', 'Fernanda Lacerda',
      'Viviane Araújo', 'Mariana Ximenes', 'Lara Jucá', 'Maitê Sasdelli', 'Fernanda Campos',
      'Andressa Urach', 'Giulia Rosa', 'Clara Dalcol', 'Martina Oliveira', 'Jéssica Beatriz Costa',
      'Geisy Arruda', 'Nicole Bahls', 'Vanusa Freitas', 'Yasmin Brunet', 'Monique Rizzeto',
      'Bruna Griphao', 'Larissa Santos', 'Juliette', 'Juju Salimeni', 'Carla Prata',
      'Iza', 'Mulher Melão', 'MC Mirella', 'Melody', 'MC Melody', 'Virginia Fonseca',
      'Alinne Rosa', 'Vivi Winkler', 'Luiza Caldi', 'Kamila Simioni', 'Ludmila',
      'Brunna Gonçalves', 'Rafa Kalimann', 'Andrea de Andrade', 'Mel Maia', 'Giovanna Jacobina',
      'Ravena Hanniely', 'Ketlin Groisman', 'Rosiane Pinheiro', 'Francine Piaia', 'Petra Mattar',
      'Juli Figueiró', 'Pietra Príncipe', 'Jaque Khury', 'Nubia Oliiver', 'Amanda Leon',
      'Ana Akiva', 'Viviane Bordin', 'Kerolay Chaves', 'Brida Nunes', 'Cristianne Menezes',
      'Kine-chan', 'Lívia Andrade', 'Elis Nebsniak', 'Júlia Mayumi', 'Gisa Custolli',
      'Key Alves', 'Babi Palomas', 'Cris Casttiel', 'Mimi Boliviana', 'Luiza Marcato',
      'Duda Monet', 'Mikaela Testa', 'Daiane Tomazoni', 'Paty Blond', 'Larissa Sumpani',
      'Rafaela Sumpani', 'Júlia Calsing', 'Lina Nakamura', 'Stephanie Silveira', 'Vanessa Ataides',
      'Stephanie Chavier', 'Fernanda Bande', 'Faby Vargas', 'Beatriz Miuky', 'Kethleen Marino',
      'Márcia Carvalho', 'Iara Ferreira', 'Bia Fernandes', 'Raíssa Souza', 'Bruna Romani',
      'Bella Thorne', 'Sabrina Sato', 'Giovanna Ewbank', 'Fernanda Lima', 'Claudia Leitte',
      'Ivete Sangalo', 'Daniela Mercury', 'Preta Gil', 'Elba Ramalho', 'Margareth Menezes',
      'Carla Perez', 'Scheila Carvalho', 'Sheila Mello', 'Carla Diaz', 'Flavia Alessandra'
    ];
    
    const results = [];
    let maxWorkingBatchSize = 0;
    let optimalBatchSize = 0;
    let bestEfficiency = 0;
    
    for (const batchSize of testSizes) {
      const celebrities = allCelebrities.slice(0, batchSize);
      
      try {
        logger.info(`🧪 Testing MAXIMUM batch size ${batchSize} with ${celebrities.length} celebrities`);
        logger.info(`📝 Query will be: ${celebrities.slice(0, 3).join(' OR ')}... (${celebrities.length} total)`);
        
        const startTime = Date.now();
        const articles = await serperService.searchMultipleCelebrities(celebrities, {
          searchType: 'comprehensive',
          articlesPerCelebrity: 5
        });
        const duration = Date.now() - startTime;
        
        const efficiency = Math.round((articles.length / 1) * 100) / 100; // Articles per API call (batch uses 1 call)
        const apiCallsFor98Celebrities = Math.ceil(98 / batchSize);
        
        const result = {
          batchSize,
          celebritiesInBatch: celebrities.length,
          articlesReturned: articles.length,
          articlesPerCelebrity: Math.round(articles.length / batchSize * 100) / 100,
          duration,
          efficiency,
          apiCallsFor98Celebrities,
          estimatedDailyUsage: `${apiCallsFor98Celebrities}/100 (${Math.round(apiCallsFor98Celebrities/100*100)}%)`,
          success: true,
          sampleTitles: articles.slice(0, 3).map(a => a.title),
          queryLength: celebrities.map(name => `"${name}"`).join(' OR ').length
        };
        
        results.push(result);
        maxWorkingBatchSize = batchSize;
        
        if (efficiency > bestEfficiency) {
          bestEfficiency = efficiency;
          optimalBatchSize = batchSize;
        }
        
        logger.info(`✅ BATCH SIZE ${batchSize} SUCCESS: ${articles.length} articles, ${efficiency} efficiency, ${apiCallsFor98Celebrities} API calls needed`);
        
        // Longer delay for large batches to avoid overwhelming Serper
        const delay = batchSize > 50 ? 5000 : 3000;
        logger.info(`⏱️ Waiting ${delay}ms before next test...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
      } catch (error) {
        logger.error(`❌ BATCH SIZE ${batchSize} FAILED:`, error);
        
        const errorResult = {
          batchSize,
          celebritiesInBatch: celebrities.length,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          queryLength: celebrities.map(name => `"${name}"`).join(' OR ').length,
          isMaximumExceeded: true
        };
        
        results.push(errorResult);
        
        // If we hit an error, we've likely found the maximum
        logger.warn(`🚨 Maximum batch size likely reached at ${batchSize}. Last working size: ${maxWorkingBatchSize}`);
        break;
      }
    }
    
    // Calculate potential improvements
    const currentBatchSize = 3;
    const currentApiCalls = Math.ceil(98 / currentBatchSize);
    const optimalApiCalls = Math.ceil(98 / maxWorkingBatchSize);
    const improvement = Math.round((1 - optimalApiCalls / currentApiCalls) * 100);
    
    res.json({
      success: true,
      message: `Maximum batch size testing completed. Found maximum working batch size: ${maxWorkingBatchSize}`,
      data: {
        results,
        summary: {
          totalTestsRun: results.length,
          successfulTests: results.filter(r => r.success).length,
          maxWorkingBatchSize,
          optimalBatchSize,
          bestEfficiency,
          currentVsOptimal: {
            currentBatchSize,
            currentApiCalls,
            optimalBatchSize: maxWorkingBatchSize,
            optimalApiCalls,
            improvementPercentage: improvement,
            dailyUsageReduction: `${currentApiCalls} → ${optimalApiCalls} API calls (${improvement}% reduction)`
          }
        },
        recommendations: {
          production: `Use batch size ${maxWorkingBatchSize} for maximum efficiency`,
          apiCalls: `Only ${optimalApiCalls} API calls needed for all 98 celebrities`,
          dailyUsage: `${Math.round(optimalApiCalls/100*100)}% of daily limit (${optimalApiCalls}/100)`,
          efficiency: `${improvement}% reduction in API calls vs current batch size of 3`
        }
      },
      timestamp: new Date().toISOString(),
    });
  });
}
