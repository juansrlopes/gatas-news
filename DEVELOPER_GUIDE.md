# 🛠️ Developer Quick Reference Guide

A quick reference for developers working on Gatas News.

## 🚀 Quick Start Commands

```bash
# First time setup
npm run setup                    # Run setup script
npm run migrate:celebrities      # Populate database

# Daily development
npm run dev                      # Start both frontend and API
npm run services:start           # Start MongoDB and Redis
npm run kill:port               # Kill processes on port 8000

# Database operations
npm run db:status               # Check database contents
npm run db:clear                # Clear articles and logs
npm run api:fetch               # Trigger news fetch

# Monitoring
npm run api:health              # Check API health
npm run api:news                # Check article count
npm run logs:api                # View API logs
npm run services:status         # Check service status
```

## 🔑 NEW: API Key Validation Feature

**IMPORTANT**: The API now validates all NewsAPI keys on startup and crashes with a clear error if all keys are rate limited.

### What This Means for Developers

```bash
# When you start the API, it will:
# 1. Test all configured API keys (NEWS_API_KEY, NEWS_API_KEY_BACKUP, NEWS_API_KEY_BACKUP_2)
# 2. Use the first working key
# 3. CRASH with detailed error if all keys are rate limited

# Example error message:
# 🚨 FATAL ERROR: ALL API KEYS ARE RATE LIMITED!
# NewsAPI Developer Account Limits:
# - 100 requests per 24 hours
# - 50 requests available every 12 hours
# Solutions:
# 1. ⏰ WAIT: Keys will reset in ~24 hours
# 2. 🔑 NEW KEYS: Get additional keys from https://newsapi.org/register
# 3. 💰 UPGRADE: Purchase paid NewsAPI plan
```

### Benefits

- **No more guessing**: You'll know immediately if keys are rate limited
- **Clear solutions**: Tells you exactly what to do
- **Prevents wasted time**: Server won't start with broken keys
- **Professional error handling**: Clean, informative messages

## 📁 Key Files to Know

### Backend (API)

```
apps/api/src/
├── server.ts                   # Entry point and startup
├── utils/apiKeyValidator.ts    # NEW: API key validation on startup
├── jobs/newsFetcher.ts         # News fetching logic
├── utils/contentScoring.ts     # Portuguese content filtering
├── services/newsService.ts     # Business logic for news
├── controllers/newsController.ts # HTTP endpoints
└── database/models/Article.ts  # Article schema
```

### Frontend

```
apps/frontend/src/
├── components/NewsGrid.tsx     # Main news display
├── pages/index.tsx            # Homepage
└── config/env.ts              # Environment config
```

### Shared

```
libs/shared/
├── types/src/index.ts         # Shared TypeScript types
└── utils/src/index.ts         # Shared utilities
```

## 🔧 Common Development Tasks

### Adding a New Celebrity

```bash
# Method 1: Via API
curl -X POST http://localhost:8000/api/v1/admin/celebrities \
  -H "Content-Type: application/json" \
  -d '{"name": "Celebrity Name", "category": "actress"}'

# Method 2: Add to celebrities.json and run migration
npm run migrate:celebrities
```

### Testing News Fetch

```bash
# Check current articles
npm run api:news

# Trigger manual fetch
npm run api:fetch

# Check articles again
npm run api:news

# View detailed results
curl -s "http://localhost:8000/api/v1/news?limit=3" | jq
```

### Debugging Content Filtering

```bash
# Lower the content threshold for testing
# Edit apps/api/src/jobs/newsFetcher.ts
# Change: shouldKeepArticle(contentScore, 25)
# To: shouldKeepArticle(contentScore, 10)

# Clear database and re-fetch
npm run db:clear
npm run api:fetch
```

### Monitoring Performance

```bash
# Check response times
curl -w "@curl-format.txt" -s "http://localhost:8000/api/v1/news" > /dev/null

# Monitor logs in real-time
npm run logs:api

# Check cache hit rates (look for "Cache hit" vs "Cache miss")
grep -E "(Cache hit|Cache miss)" apps/api/logs/combined.log | tail -20
```

## 🐛 Troubleshooting Guide

### API Won't Start

```bash
# Check if port is in use
npm run kill:port

# Check services are running
npm run services:status

# Start services if needed
npm run services:start

# Check environment file exists
ls -la apps/api/.env

# NEW: Check for API key rate limit errors
# If you see "FATAL ERROR: ALL API KEYS ARE RATE LIMITED!"
# - Wait ~24 hours for rate limits to reset
# - Get additional API keys from https://newsapi.org/register
# - Check current key status manually:
curl -s "https://newsapi.org/v2/everything?q=test&apiKey=YOUR_KEY&pageSize=1" | jq '.status'
```

### No Articles Fetched

```bash
# NEW: API now validates keys on startup, so if server starts, keys should work
# Check API key is set
grep NEWS_API_KEY apps/api/.env

# Test API key manually (if server won't start)
curl -s "https://newsapi.org/v2/everything?q=test&apiKey=YOUR_KEY&pageSize=1" | jq '.status'

# Check database connection
npm run db:status

# Check content filtering threshold
grep "shouldKeepArticle" apps/api/src/jobs/newsFetcher.ts

# Manual fetch with detailed logs
npm run api:fetch
npm run logs:api
```

### Frontend Not Loading Articles

```bash
# Check API is responding
npm run api:health
npm run api:news

# Check frontend is calling correct endpoint
# Look in apps/frontend/src/components/NewsGrid.tsx
# Should be: GET /api/v1/news

# Check browser network tab for errors
```

### Images Not Loading

```bash
# Check image proxy is working
curl "http://localhost:3000/api/image-proxy?url=https://veja.abril.com.br/test.jpg"

# Check browser console for domain validation logs
# Look for: [IMAGE-PROXY] or [IMAGE-FAILURE] messages

# Test specific domain validation
curl "http://localhost:3000/api/image-proxy?url=https://suspicious.tk/test.jpg"
# Should return: {"error":"Invalid or unauthorized URL"}

# Monitor domain failures in real-time
# Open browser console while browsing articles
```

### Database Issues

```bash
# Check MongoDB is running
brew services list | grep mongodb

# Test connection
mongosh gatas-news --eval "db.runCommand('ping')"

# Check collections
npm run db:status

# Reset database if needed
npm run db:clear
npm run migrate:celebrities
```

## 🧪 Testing

### Running Tests

```bash
npm run test                    # All tests
npm run test:api               # API tests only
npm run test:frontend          # Frontend tests only

# Specific test file
cd apps/api && npx jest src/services/newsService.test.ts

# Watch mode
cd apps/api && npx jest --watch
```

### Manual API Testing

```bash
# Health check
curl http://localhost:8000/health

# Get news
curl "http://localhost:8000/api/v1/news?limit=5"

# Search news
curl "http://localhost:8000/api/v1/news?searchTerm=fashion&limit=5"

# Filter by celebrity
curl "http://localhost:8000/api/v1/news?celebrity=Anitta&limit=5"

# Get trending
curl http://localhost:8000/api/v1/news/trending

# Admin endpoints
curl -X POST http://localhost:8000/api/v1/admin/fetch/trigger
curl http://localhost:8000/api/v1/admin/celebrities
```

## 📊 Understanding the Content Scoring

The Portuguese content scoring system filters articles based on:

### High Score (Keep) - 60+ points

- Articles with photos/videos (`foto`, `selfie`, `vídeo`)
- Fashion/lifestyle content (`look`, `vestido`, `praia`)
- Celebrity as main subject (action verbs like `posou`, `exibiu`)
- Entertainment sources (`quem.com.br`, `caras.com.br`)

### Low Score (Filter Out) - Below 25 points

- Interview-only content (`entrevista`, `declaração`)
- Political content (`política`, `eleição`)
- Articles without visual indicators
- News sources (`g1.globo.com`, `folha.uol.com.br`)

### Adjusting the Filter

```typescript
// In apps/api/src/jobs/newsFetcher.ts
const keepArticle = shouldKeepArticle(contentScore, 25); // Adjust this number

// Lower = more articles (less strict)
// Higher = fewer articles (more strict)
```

## 🔄 Background Jobs

### Job Schedule

- **Daily News Fetch**: 6:00 AM Brazil time (production) / Every 30 min (development)
- **Weekly Cleanup**: Sundays at 2:00 AM
- **Health Checks**: Every hour

### Manual Job Control

```bash
# Trigger news fetch
npm run api:fetch

# Check job status via API
curl http://localhost:8000/api/v1/admin/jobs/status

# View job logs
npm run logs:api | grep "job"
```

## 🚀 Performance Tips

### Database Optimization

- Articles are indexed on `celebrity`, `publishedAt`, `isActive`
- Use pagination for large datasets
- Cache frequently accessed data

### API Performance

- Responses are cached for 1 hour
- Use `limit` parameter to control response size
- Monitor response times in logs

### Content Filtering

- Adjust threshold based on article volume needs
- Monitor filter effectiveness with logs
- Consider A/B testing different thresholds

## 📝 Code Style Guide

### TypeScript

- Use interfaces for data structures
- Prefer `const` over `let`
- Use meaningful variable names
- Add JSDoc comments for public methods

### Error Handling

- Use `asyncHandler` for route handlers
- Log errors with context
- Return meaningful error messages
- Don't expose internal errors to clients

### Database

- Use repositories for data access
- Validate input data
- Handle connection errors gracefully
- Use transactions for multi-step operations

## 🔗 Useful Resources

- [NewsAPI Documentation](https://newsapi.org/docs)
- [MongoDB Query Guide](https://docs.mongodb.com/manual/tutorial/query-documents/)
- [Redis Commands](https://redis.io/commands)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Next.js Documentation](https://nextjs.org/docs)

## 🆘 Getting Help

1. Check this guide first
2. Look at existing code patterns
3. Check the logs: `npm run logs:api`
4. Test with curl commands
5. Ask team members or create an issue

Remember: When in doubt, check the logs! 📋
