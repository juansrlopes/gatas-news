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

# Database operations (SAFE)
npm run db:status               # Check database contents
npm run db:clear:safe           # 🛡️ Clear articles and logs (preserves celebrities)
npm run db:reset:safe           # 🛡️ Full reset (preserves celebrities)
npm run db:backup:celebrities   # 💾 Backup celebrities to JSON file
npm run api:fetch               # Trigger news fetch

# Monitoring
npm run api:health              # Check API health
npm run api:news                # Check article count
npm run logs:api                # View API logs
npm run services:status         # Check service status
```

## 🛡️ CRITICAL: Safe Database Operations

**ALWAYS use safe database commands to preserve celebrities!**

### ✅ Safe Commands (Use These)

```bash
npm run db:clear:safe           # Clear articles and logs only
npm run db:clear:articles       # Clear articles only
npm run db:clear:logs          # Clear fetch logs only
npm run db:clear:cache         # Clear Redis cache only
npm run db:reset:safe          # Full reset preserving celebrities
npm run db:backup:celebrities  # Create celebrity backup
```

### ❌ Dangerous Commands (Avoid These)

```bash
# These can delete celebrities - DON'T USE:
mongosh gatas-news --eval "db.celebrities.deleteMany({})"
mongosh gatas-news --eval "db.dropDatabase()"
npm run db:clear  # Shows warning, redirects to safe version
```

### 🔄 Recommended Workflow

```bash
# 1. Always backup first
npm run db:backup:celebrities

# 2. Safe clear
npm run db:clear:safe

# 3. Repopulate articles
npm run api:fetch

# 4. Verify
npm run db:status
```

## 🔑 API Key Validation & Linting System

### **API Key Validation Feature**

**IMPORTANT**: The API validates all NewsAPI keys on startup and crashes with clear error if all keys are rate limited.

```bash
# When you start the API, it will:
# 1. Test all configured API keys (NEWS_API_KEY, NEWS_API_KEY_BACKUP, NEWS_API_KEY_BACKUP_2)
# 2. Use the first working key
# 3. CRASH with detailed error if all keys are rate limited

# Example error message:
# 🚨 FATAL ERROR: ALL API KEYS ARE RATE LIMITED!
# Solutions: Wait ~24 hours, get new keys, or upgrade plan
```

### **🚨 CRITICAL: New Linting System**

**ZERO TOLERANCE POLICY**: All code must pass linting with zero errors and zero warnings.

#### **Fixed Linting Issues**

- ✅ **`npm run lint` no longer hangs** - Fixed circular dependency issue
- ✅ **Git Hooks**: Automatic pre-commit and pre-push linting
- ✅ **Comprehensive Coverage**: All projects linted (shared-types, shared-utils, api, frontend)
- ✅ **TypeScript Strict**: No `any` types allowed, proper error handling

#### **Linting Commands**

```bash
# ✅ WORKING - Fast and reliable
npm run lint               # Lint all projects (267ms)
npm run lint:frontend      # Frontend only
npm run lint:api           # API only

# 🔧 Git Hooks (Automatic)
# Pre-commit: Lints staged files
# Pre-push: Full workspace lint
```

#### **Quality Standards**

- **Zero Errors**: No ESLint errors allowed
- **Zero Warnings**: No ESLint warnings allowed  
- **TypeScript Strict**: Proper typing required
- **Unused Variables**: Must be prefixed with `_`
- **Error Handling**: Use type guards, not `any`

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

# Check for API key rate limit errors
# If you see "FATAL ERROR: ALL API KEYS ARE RATE LIMITED!"
# - Wait ~24 hours for rate limits to reset
# - Get additional API keys from https://newsapi.org/register
```

### Linting Issues

```bash
# If npm run lint hangs or fails:
npx nx reset                    # Clear Nx cache
npm run lint                    # Should work now (267ms)

# If you see linting errors:
# 1. Fix all errors and warnings (zero tolerance)
# 2. Use type guards instead of 'any'
# 3. Prefix unused variables with '_'
# 4. Ensure proper TypeScript typing

# Git hooks not working:
npm run prepare                 # Reinstall Husky hooks
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
