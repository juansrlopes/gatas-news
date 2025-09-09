# 🐱 Gatas News

A modern news aggregation platform focused on Brazilian celebrities, built with Next.js and Node.js in an Nx monorepo.

## 📋 Overview

Gatas News automatically fetches, filters, and curates news articles about Brazilian celebrities using advanced Portuguese content scoring. The platform emphasizes visual appeal and relevance, filtering out low-quality content to provide users with engaging celebrity news.

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   External APIs │
│   (Next.js)     │◄──►│   (Node.js)     │◄──►│   (NewsAPI)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Database      │
                       │   (MongoDB)     │
                       └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Cache         │
                       │   (Redis)       │
                       └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **MongoDB** 4.4+
- **Redis** 6.0+
- **NewsAPI.org** account (free tier available)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd gatas-news
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   # Copy and configure environment file
   cp apps/api/.env.example apps/api/.env
   # Edit apps/api/.env with your configuration
   ```

4. **Start services**

   ```bash
   # Start MongoDB (if using Homebrew)
   brew services start mongodb-community

   # Start Redis (if using Homebrew)
   brew services start redis
   ```

5. **Run the application**

   ```bash
   # Start both frontend and API
   npm run dev

   # Or start individually
   npm run dev:api      # API only
   npm run dev:frontend # Frontend only
   ```

6. **Access the application**
   - **Frontend**: http://localhost:3000
   - **API**: http://localhost:8000
   - **Health Check**: http://localhost:8000/health

## 📁 Project Structure

```
gatas-news/
├── apps/
│   ├── api/                 # Backend API (Node.js + Express)
│   │   ├── src/
│   │   │   ├── controllers/ # Request handlers
│   │   │   ├── services/    # Business logic
│   │   │   ├── database/    # Models & repositories
│   │   │   ├── jobs/        # Background tasks
│   │   │   ├── middleware/  # Express middleware
│   │   │   ├── routes/      # API routes
│   │   │   └── utils/       # Utilities
│   │   └── .env             # API environment variables
│   └── frontend/            # Frontend app (Next.js)
│       └── src/
│           ├── components/  # React components
│           ├── pages/       # Next.js pages
│           └── styles/      # CSS styles
├── libs/
│   └── shared/              # Shared libraries
│       ├── types/           # TypeScript interfaces
│       └── utils/           # Shared utilities
└── README.md               # This file
```

## 🔧 Configuration

### Environment Variables

Create `apps/api/.env` with the following variables:

```bash
# News API Configuration (CRITICAL - Server will crash if all keys are rate limited)
NEWS_API_KEY=your_newsapi_key_here
NEWS_API_KEY_BACKUP=backup_key_here
NEWS_API_KEY_BACKUP_2=third_backup_key_here

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/gatas-news
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Server Configuration
PORT=8000
NODE_ENV=development
```

### Getting a NewsAPI Key

1. Visit [NewsAPI.org](https://newsapi.org/)
2. Sign up for a free account
3. Copy your API key to the `.env` file

## 🎯 Key Features

### 🤖 Intelligent Content Filtering

The platform uses a sophisticated Portuguese content scoring system that:

- **Analyzes visual appeal**: Prioritizes articles with photos, videos, and visual content
- **Scores relevance**: Ensures articles are genuinely about the celebrities
- **Filters quality**: Removes low-quality content like interviews without photos
- **Source quality**: Weights entertainment sources higher than news sources

### 📊 Content Scoring Algorithm

Articles are scored on multiple factors:

- **High-value keywords**: Beach, fashion, fitness content (80-100 points)
- **Medium-value keywords**: General celebrity content (40-79 points)
- **Photo indicators**: Articles with visual content get bonus points
- **Source quality**: Entertainment sources ranked higher than news sources
- **Action verbs**: Indicates celebrity is the main subject

### 🔄 Automated News Fetching

- **Scheduled fetching**: Daily at 6 AM (configurable)
- **Manual triggers**: Admin can trigger fetches via API
- **Duplicate handling**: Prevents duplicate articles
- **Rate limiting**: Respects NewsAPI rate limits

### ⚡ Performance Features

- **Redis caching**: Fast response times with intelligent cache invalidation
- **Database indexing**: Optimized MongoDB queries
- **Pagination**: Efficient handling of large datasets
- **Background processing**: Non-blocking news fetching

### 🛡️ Dynamic Image Security

- **Smart domain validation**: Auto-validates news domains (.com.br, .globo.com, etc.)
- **Security monitoring**: Blocks suspicious domains (.tk, .ml, localhost)
- **Learning system**: Logs new domains for future whitelisting
- **Graceful fallbacks**: Smart image placeholders when sources fail

## 🛠️ Development

### Available Scripts

```bash
# Setup and Development
npm run setup              # Run initial setup script
npm run dev                # Start both frontend and API
npm run dev:api            # Start API only
npm run dev:frontend       # Start frontend only

# Building
npm run build              # Build both applications
npm run build:api          # Build API only
npm run build:frontend     # Build frontend only

# Testing
npm run test               # Run all tests
npm run test:api           # Run API tests
npm run test:frontend      # Run frontend tests

# Database Operations (Safe)
npm run db:status          # Check database contents
npm run db:clear:safe      # 🛡️ Clear articles and logs (preserves celebrities)
npm run db:clear:articles  # Clear articles only
npm run db:clear:logs      # Clear fetch logs only
npm run db:clear:cache     # Clear Redis cache
npm run db:reset:safe      # 🛡️ Full reset (preserves celebrities)
npm run db:backup:celebrities # 💾 Backup celebrities to JSON file
npm run migrate:celebrities # Populate database with celebrities

# ⚠️ DEPRECATED (use safe versions above)
npm run db:clear           # Old unsafe clear (shows warning)

# API Operations
npm run api:health         # Check API health
npm run api:fetch          # Trigger news fetch
npm run api:news           # Check article count

# Services Management
npm run services:start     # Start MongoDB and Redis
npm run services:stop      # Stop MongoDB and Redis
npm run services:status    # Check service status

# Monitoring and Debugging
npm run logs:api           # View API logs
npm run logs:error         # View error logs
npm run kill:port          # Kill processes on port 8000

# Code Quality
npm run lint               # Lint all code
npm run format             # Format code with Prettier
npm run clean              # Clean and reinstall dependencies
```

### Database Setup

The API automatically connects to MongoDB and creates necessary collections. To populate with celebrities:

```bash
npm run migrate:celebrities
```

### 🛡️ Safe Database Operations

**IMPORTANT**: Always use the safe database commands to preserve celebrities:

```bash
# ✅ SAFE - Preserves celebrities
npm run db:clear:safe      # Clear articles and logs only
npm run db:reset:safe      # Full reset preserving celebrities

# ❌ AVOID - Can delete celebrities
mongosh gatas-news --eval "db.articles.deleteMany({}); db.celebrities.deleteMany({})"
```

**Best Practice Workflow**:

1. `npm run db:backup:celebrities` - Create backup
2. `npm run db:clear:safe` - Safe clear
3. `npm run api:fetch` - Repopulate articles

### Testing the API

```bash
# Health check
curl http://localhost:8000/health

# Get news articles
curl http://localhost:8000/api/v1/news

# Get articles for specific celebrity
curl "http://localhost:8000/api/v1/news?celebrity=Anitta"

# Trigger manual news fetch (admin)
curl -X POST http://localhost:8000/api/v1/admin/fetch/trigger
```

## 📚 API Documentation

### Main Endpoints

| Method | Endpoint                      | Description         |
| ------ | ----------------------------- | ------------------- |
| GET    | `/health`                     | Health check        |
| GET    | `/api/v1/news`                | Get news articles   |
| GET    | `/api/v1/news/trending`       | Get trending topics |
| POST   | `/api/v1/admin/fetch/trigger` | Trigger news fetch  |
| GET    | `/api/v1/admin/celebrities`   | Manage celebrities  |

### Query Parameters

**GET /api/v1/news**

- `page` (number): Page number (default: 1)
- `limit` (number): Articles per page (default: 20)
- `celebrity` (string): Filter by celebrity name
- `sortBy` (string): Sort by 'publishedAt', 'relevancy', or 'popularity'
- `searchTerm` (string): Search in title/description
- `sentiment` (string): Filter by 'positive', 'negative', or 'neutral'

## 🔍 Troubleshooting

### Common Issues

**Port 8000 already in use**

```bash
# Kill processes on port 8000
lsof -ti:8000 | xargs kill -9
```

**MongoDB connection failed**

```bash
# Start MongoDB
brew services start mongodb-community
# Or check if running
brew services list | grep mongodb
```

**Redis connection failed**

```bash
# Start Redis
brew services start redis
# Test connection
redis-cli ping
```

**No articles appearing**

- Check if NewsAPI key is valid and not rate limited
- API will crash on startup if all keys are rate limited with clear error message
- Trigger manual fetch: `curl -X POST http://localhost:8000/api/v1/admin/fetch/trigger`
- Check API logs for errors

**API crashes on startup with "FATAL ERROR: ALL API KEYS ARE RATE LIMITED!"**

- NewsAPI free accounts are limited to 100 requests per 24 hours
- Wait ~24 hours for rate limits to reset
- Get additional API keys from [NewsAPI.org](https://newsapi.org/register)
- Consider upgrading to a paid NewsAPI plan for higher limits

**Images not loading**

- Check browser console for domain validation errors
- Verify image proxy: `curl "http://localhost:3000/api/image-proxy?url=https://test-domain.com/image.jpg"`
- Review blocked domains in console logs

### Debug Mode

Set `NODE_ENV=development` in your `.env` file to enable:

- Enhanced logging
- Detailed error messages
- Debug information in console

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Code Style

- Use TypeScript for all new code
- Follow existing naming conventions
- Add tests for new features
- Run `npm run lint` before committing
- Use `npm run format` to format code

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [NewsAPI.org](https://newsapi.org/) for news data
- [Nx](https://nx.dev/) for monorepo tooling
- [Next.js](https://nextjs.org/) for the frontend framework
- [Express.js](https://expressjs.com/) for the API framework
