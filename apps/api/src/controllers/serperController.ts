/**
 * Serper Controller
 * 
 * Admin endpoints for testing and managing Serper integration
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { serperService } from '../services/serper/serperService';
import { APIResponse } from '../../../../libs/shared/types/src/index';
import logger from '../utils/logger';

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

    const result = await serperService.searchCelebrity(celebrity as string, {
      searchType: 'comprehensive',
      limit: Number(limit),
      dateRestrict: 'w1' // Last week
    });

    res.json({
      success: true,
      message: `Serper API test completed for ${celebrity}`,
      data: {
        celebrity,
        articlesFound: result.length,
        articles: result.map(article => ({
          title: article.title,
          source: article.source.name,
          publishedAt: article.publishedAt,
          url: article.url,
          hasImage: !!article.urlToImage,
        })),
        sampleTitles: result.slice(0, 3).map(a => a.title),
      },
      timestamp: new Date().toISOString(),
    });
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
          hasImages: serperResults.filter(a => a.urlToImage).length,
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
