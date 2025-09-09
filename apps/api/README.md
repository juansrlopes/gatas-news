# 🚀 Gatas News API

The backend API for the Gatas News platform, built with Node.js, Express, and TypeScript.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Controllers   │    │    Services     │    │  Repositories   │
│   (HTTP Layer)  │◄──►│ (Business Logic)│◄──►│ (Data Access)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Middleware    │    │   Background    │    │   Database      │
│   (Auth, Cache) │    │     Jobs        │    │   (MongoDB)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📁 Directory Structure

```
apps/api/
├── src/
│   ├── controllers/     # HTTP request handlers
│   │   ├── newsController.ts
│   │   ├── adminController.ts
│   │   └── celebrityController.ts
│   ├── services/        # Business logic layer
│   │   ├── newsService.ts
│   │   ├── celebrityService.ts
│   │   └── cacheService.ts
│   ├── database/        # Data layer
│   │   ├── models/      # Mongoose schemas
│   │   ├── repositories/ # Data access objects
│   │   └── connections/ # DB connections
│   ├── jobs/            # Background tasks
│   │   ├── newsFetcher.ts
│   │   └── scheduler.ts
│   ├── middleware/      # Express middleware
│   │   ├── errorHandler.ts
│   │   ├── rateLimiter.ts
│   │   └── security.ts
│   ├── routes/          # API route definitions
│   │   ├── news.ts
│   │   ├── admin.ts
│   │   └── celebrities.ts
│   ├── utils/           # Utility functions
│   │   ├── logger.ts
│   │   ├── contentScoring.ts
│   │   └── cache.ts
│   ├── types/           # TypeScript type definitions
│   ├── app.ts           # Express app configuration
│   └── server.ts        # Server startup
├── .env                 # Environment variables
├── index.ts             # Entry point
├── package.json         # Dependencies
└── tsconfig.json        # TypeScript config
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB 4.4+
- Redis 6.0+
- NewsAPI.org account

### Setup

1. **Install dependencies** (from project root):

   ```bash
   npm install
   ```

2. **Configure environment**:

   ```bash
   cp apps/api/.env.example apps/api/.env
   # Edit .env with your configuration
   ```

3. **Start services**:

   ```bash
   # MongoDB
   brew services start mongodb-community

   # Redis
   brew services start redis
   ```

4. **Run the API**:

   ```bash
   npm run dev:api
   ```

5. **Verify it's working**:
   ```bash
   curl http://localhost:8000/health
   ```

## 🔧 Configuration

### Environment Variables

```bash
# News API Configuration (CRITICAL - Server validates on startup)
NEWS_API_KEY=your_newsapi_key_here           # Primary API key
NEWS_API_KEY_BACKUP=backup_key_here          # Backup API key
NEWS_API_KEY_BACKUP_2=third_backup_key_here  # Third backup API key

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/gatas-news
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Server Configuration
PORT=8000
NODE_ENV=development                         # development | production
```

## 📊 Key Components

### 🔑 API Key Validation (`utils/apiKeyValidator.ts`)

**NEW FEATURE**: Automatic API key validation on server startup prevents issues with rate-limited keys.

**How it works:**

- Tests all configured API keys on server startup
- Crashes server with clear error message if all keys are rate limited
- Provides detailed solutions (wait, get new keys, upgrade plan)
- Prevents wasted development time with non-working keys

**Configuration:**

```bash
# Server tests keys in this order and uses first working one
NEWS_API_KEY=primary_key
NEWS_API_KEY_BACKUP=backup_key
NEWS_API_KEY_BACKUP_2=third_key
```

**Error handling:**

- Rate limited keys: Clear message with reset time and solutions
- Invalid keys: Validation error with instructions
- Network errors: Graceful handling with retry suggestions

### 🤖 News Fetcher (`jobs/newsFetcher.ts`)

Automatically fetches and processes news articles:

- **Fetches from NewsAPI**: Uses celebrity names as search terms
- **Content filtering**: Applies Portuguese content scoring
- **Duplicate detection**: Prevents duplicate articles
- **Batch processing**: Handles large datasets efficiently
- **Rate limiting**: Respects API limits with delays

**Key Methods:**

- `fetchAndStoreNews()`: Main fetch process
- `fetchArticlesForAllCelebrities()`: Batch celebrity processing
- `processAndStoreArticles()`: Content filtering and storage

### 🎯 Content Scoring (`utils/contentScoring.ts`)

Sophisticated algorithm for filtering Portuguese content:

```typescript
interface ContentScore {
  visualAppeal: number; // 0-100: Visual content quality
  relevance: number; // 0-100: Celebrity relevance
  contentType: string; // Content category
  overallScore: number; // 0-100: Combined score
  reasons: string[]; // Scoring rationale
}
```

**Scoring Factors:**

- **High-value keywords**: Beach, fashion, fitness (+20 points each)
- **Photo indicators**: Visual content required (+20 points)
- **Action verbs**: Celebrity as main subject (+25 points)
- **Source quality**: Entertainment vs news sources (±20 points)
- **Low-value penalties**: Interviews, politics (-15 points each)

### 🗄️ Database Models

**Article Schema:**

```typescript
interface IArticle {
  url: string; // Unique article URL
  title: string; // Article title
  description: string; // Article description
  urlToImage?: string; // Featured image URL
  publishedAt: Date; // Publication date
  source: {
    // News source info
    id: string | null;
    name: string;
  };
  celebrity: string; // Associated celebrity
  sentiment?: string; // positive | negative | neutral
  isActive: boolean; // Soft delete flag
}
```

**Celebrity Schema (Simplified):**

```typescript
interface ICelebrity {
  name: string; // Celebrity name (primary identifier)
  aliases: string[]; // Alternative names and nicknames
  isActive: boolean; // Active status
  createdAt: Date; // Creation timestamp
  updatedAt: Date; // Last update timestamp
}
```

**Note**: The celebrity model was simplified to remove bloat fields like `priority`, `category`, `socialMedia`, `description`, and `searchTerms` that were not being used effectively.

### ⚡ Caching Strategy (`services/cacheService.ts`)

Multi-layer caching for optimal performance:

- **Redis (Primary)**: Distributed caching for production
- **Memory (Fallback)**: In-memory cache if Redis unavailable
- **TTL Management**: Configurable expiration times
- **Cache Invalidation**: Smart cache clearing on data updates

**Cache Keys:**

- `news:page:1:limit:20:sort:publishedAt`
- `news:celebrity:Anitta:page:1:limit:20`
- `news:search:music:page:1:limit:20`

## 🛣️ API Endpoints

### Public Endpoints

#### GET `/health`

Health check endpoint

```bash
curl http://localhost:8000/health
```

#### GET `/api/v1/news`

Get news articles with filtering and pagination

**Query Parameters:**

- `page` (number): Page number (default: 1)
- `limit` (number): Articles per page (default: 20, max: 100)
- `celebrity` (string): Filter by celebrity name
- `sortBy` (string): 'publishedAt' | 'relevancy' | 'popularity'
- `searchTerm` (string): Search in title/description
- `sentiment` (string): 'positive' | 'negative' | 'neutral'
- `dateFrom` (string): ISO date string
- `dateTo` (string): ISO date string

**Example:**

```bash
curl "http://localhost:8000/api/v1/news?celebrity=Anitta&limit=10&page=1"
```

#### GET `/api/v1/news/trending`

Get trending celebrities/topics

```bash
curl http://localhost:8000/api/v1/news/trending
```

### Admin Endpoints

#### POST `/api/v1/admin/fetch/trigger`

Manually trigger news fetch

```bash
curl -X POST http://localhost:8000/api/v1/admin/fetch/trigger \
  -H "Content-Type: application/json"
```

#### GET `/api/v1/admin/celebrities`

Get all celebrities (alphabetically sorted)

```bash
curl http://localhost:8000/api/v1/admin/celebrities
```

#### POST `/api/v1/admin/celebrities`

Add new celebrity (simplified - name only)

```bash
curl -X POST http://localhost:8000/api/v1/admin/celebrities \
  -H "Content-Type: application/json" \
  -d '{"name": "New Celebrity"}'
```

#### PUT `/api/v1/admin/celebrities/:id`

Update celebrity (name and aliases)

```bash
curl -X PUT http://localhost:8000/api/v1/admin/celebrities/CELEBRITY_ID \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Name", "aliases": ["Alias1", "Alias2"]}'
```

#### DELETE `/api/v1/admin/celebrities/:id`

Delete celebrity

```bash
curl -X DELETE http://localhost:8000/api/v1/admin/celebrities/CELEBRITY_ID
```

## 🔄 Background Jobs

### Daily News Fetch

- **Schedule**: Daily at 6:00 AM (Brazil timezone)
- **Development**: Every 30 minutes
- **Process**: Fetch → Filter → Store → Cache invalidation

### Weekly Cleanup

- **Schedule**: Sundays at 2:00 AM
- **Process**: Mark old articles inactive, clean logs

### Health Checks

- **Schedule**: Every hour
- **Process**: Verify database connections, system health

## 🧪 Testing

### Running Tests

```bash
# All tests
npm run test:api

# Specific test file
npx jest src/services/newsService.test.ts

# Watch mode
npx jest --watch
```

### Test Structure

```
src/
├── controllers/
│   └── *.test.ts        # Controller tests
├── services/
│   └── *.test.ts        # Service tests
├── database/
│   └── repositories/
│       └── *.test.ts    # Repository tests
└── test/
    ├── helpers.ts       # Test utilities
    ├── factories.ts     # Test data factories
    └── setup.ts         # Test configuration
```

## 🐛 Debugging

### Enable Debug Logging

```bash
# In .env file
NODE_ENV=development
LOG_LEVEL=debug
```

### Common Debug Commands

```bash
# Check database connection
mongosh gatas-news --eval "db.runCommand('ping')"

# Check Redis connection
redis-cli ping

# View recent logs
tail -f apps/api/logs/combined.log

# Check running processes
lsof -ti:8000
```

### Troubleshooting

**API won't start - Port in use:**

```bash
lsof -ti:8000 | xargs kill -9
```

**API crashes on startup with rate limit error:**

1. All configured API keys are rate limited (100 requests/24 hours exceeded)
2. Wait ~24 hours for rate limits to reset
3. Get additional API keys from [NewsAPI.org](https://newsapi.org/register)
4. Consider upgrading to paid NewsAPI plan

**No articles fetched:**

1. Check NewsAPI key validity (server validates on startup)
2. Verify MongoDB connection
3. Check content scoring threshold (may be too high)
4. Review fetch logs in database

**High memory usage:**

1. Check Redis connection (fallback to memory cache)
2. Review cache TTL settings
3. Monitor background job frequency

## 🔒 Security

### Rate Limiting

- **General**: 100 requests per 15 minutes per IP
- **Admin**: 10 requests per 15 minutes per IP
- **News fetch**: 1 request per minute per IP

### Image Proxy Security

- **Dynamic domain validation**: Auto-validates news domains with pattern matching
- **Suspicious domain blocking**: Prevents access to .tk, .ml, localhost, private IPs
- **Security monitoring**: Logs blocked domains for security analysis
- **HTTPS enforcement**: Only allows secure image sources

### Security Headers

- Helmet.js for security headers
- CORS configuration for cross-origin requests
- Input validation with express-validator

### Environment Security

- Sensitive data in environment variables
- No hardcoded secrets in code
- Separate development/production configs

## 📈 Performance

### Optimization Features

- **Database indexing**: Optimized queries on celebrity, date, active status
- **Connection pooling**: MongoDB connection pool (max 10)
- **Batch processing**: Articles processed in batches of 100
- **Lazy loading**: Pagination for large datasets
- **Cache warming**: Popular queries cached proactively

### Monitoring

- **Response times**: Logged for all endpoints
- **Error tracking**: Comprehensive error logging
- **Resource usage**: Memory and CPU monitoring
- **Database performance**: Query performance tracking

## 🚀 Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure production MongoDB URI
- [ ] Set up Redis cluster/instance
- [ ] Configure proper logging levels
- [ ] Set up monitoring and alerts
- [ ] Configure reverse proxy (nginx)
- [ ] Set up SSL certificates
- [ ] Configure backup strategies

### Environment Variables for Production

```bash
NODE_ENV=production
PORT=8000
MONGODB_URI=mongodb://prod-server:27017/gatas-news
REDIS_HOST=prod-redis-server
NEWS_API_KEY=production_api_key
```

## 🤝 Contributing

### Code Style & Quality

- **TypeScript**: Strict mode enabled, no `any` types allowed
- **ESLint**: Zero errors/warnings policy enforced by Git hooks
- **Naming**: Follow existing patterns and conventions
- **Documentation**: Add JSDoc comments for public methods
- **Testing**: Write tests for new features
- **Git Hooks**: Automatic pre-commit and pre-push quality checks

### Pull Request Process

1. Create feature branch from `main`
2. Write tests for new functionality
3. Ensure all tests pass
4. Update documentation if needed
5. Submit PR with clear description

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [Redis Documentation](https://redis.io/documentation)
- [NewsAPI Documentation](https://newsapi.org/docs)
- [Winston Logging](https://github.com/winstonjs/winston)
