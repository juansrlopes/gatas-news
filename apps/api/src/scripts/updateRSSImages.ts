import { Article } from '../database/models/Article';
import { mongoConnection } from '../database/connections/mongodb';
import logger from '../utils/logger';
import axios from 'axios';

/**
 * Script to update existing RSS articles with scraped images
 */
async function updateRSSArticlesWithImages() {
  try {
    await mongoConnection.connect();
    
    // Find RSS articles without images
    const rssArticles = await Article.find({
      $and: [
        {
          $or: [
            { 'source.name': 'Terra Diversão' },
            { 'source.name': 'IstoÉ Gente' },
            { 'source.name': 'Metropoles' },
            { 'source.name': 'R7 Entretenimento' },
            { 'source.name': 'Folha Celebridades' },
            { 'source.name': 'Estadão Cultura' },
            { 'source.name': 'O Globo Cultura' },
            { 'source.name': 'Veja Entretenimento' },
          ]
        },
        {
          $or: [
            { urlToImage: null },
            { urlToImage: '' },
            { urlToImage: { $exists: false } }
          ]
        }
      ]
    }).limit(20); // Process 20 articles at a time

    logger.info(`Found ${rssArticles.length} RSS articles without images`);

    let updatedCount = 0;

    for (const article of rssArticles) {
      try {
        logger.info(`Scraping image for: ${article.title.substring(0, 50)}...`);
        
        const imageUrl = await scrapeImageFromArticle(article.url);
        
        if (imageUrl) {
          await Article.updateOne(
            { _id: article._id },
            { $set: { urlToImage: imageUrl } }
          );
          updatedCount++;
          logger.info(`✅ Updated image for: ${article.title.substring(0, 50)}...`);
        } else {
          logger.info(`🚫 No image found for: ${article.title.substring(0, 50)}...`);
        }

        // Small delay to be respectful to servers
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        logger.error(`❌ Error updating article ${article._id}: ${error.message}`);
      }
    }

    logger.info(`🎉 Updated ${updatedCount} articles with images`);
    return { processed: rssArticles.length, updated: updatedCount };

  } catch (error) {
    logger.error('❌ Error in updateRSSArticlesWithImages:', error);
    throw error;
  }
}

/**
 * Scrape image from article page
 */
async function scrapeImageFromArticle(articleUrl: string): Promise<string | undefined> {
  try {
    const response = await axios.get(articleUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GatasNews/1.0; +https://gatas-news.vercel.app)',
      },
    });

    const html = response.data;
    
    // Try different meta tags for images
    const metaImagePatterns = [
      /<meta\s+property="og:image"\s+content="([^"]+)"/i,
      /<meta\s+name="twitter:image"\s+content="([^"]+)"/i,
      /<meta\s+property="og:image:url"\s+content="([^"]+)"/i,
      /<img[^>]+src="([^"]+)"[^>]*class="[^"]*featured[^"]*"/i,
      /<img[^>]+class="[^"]*featured[^"]*"[^>]+src="([^"]+)"/i,
      /<img[^>]+src="([^"]+)"[^>]*>/i, // Fallback to first image
    ];

    for (const pattern of metaImagePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        let imageUrl = match[1];
        
        // Convert relative URLs to absolute
        if (imageUrl.startsWith('//')) {
          imageUrl = 'https:' + imageUrl;
        } else if (imageUrl.startsWith('/')) {
          const urlObj = new URL(articleUrl);
          imageUrl = `${urlObj.protocol}//${urlObj.host}${imageUrl}`;
        }
        
        // Validate image URL
        if (imageUrl.includes('.jpg') || imageUrl.includes('.jpeg') || 
            imageUrl.includes('.png') || imageUrl.includes('.webp')) {
          return imageUrl;
        }
      }
    }

    return undefined;

  } catch {
    return undefined;
  }
}

export { updateRSSArticlesWithImages };

// Run if called directly
if (require.main === module) {
  updateRSSArticlesWithImages()
    .then((result) => {
      console.log('✅ Script completed:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}
