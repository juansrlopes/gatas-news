# 📚 Gatas News API Documentation

Complete API reference for the Gatas News platform with comprehensive validation rules and examples.

## 📋 Table of Contents

- [🚀 Quick Start](#-quick-start)
- [🔐 Authentication](#-authentication)
- [📰 News Endpoints](#-news-endpoints)
- [👥 Celebrity Endpoints](#-celebrity-endpoints)
- [⚙️ Admin Endpoints](#️-admin-endpoints)
- [🔑 API Key Management](#-api-key-management)
- [🛡️ Validation Rules](#️-validation-rules)
- [📊 Response Formats](#-response-formats)
- [❌ Error Handling](#-error-handling)
- [📈 Rate Limiting](#-rate-limiting)

---

## 🚀 Quick Start

### Base URL

```
Development: http://localhost:8000
Production: https://your-domain.com
```

### Health Check

```bash
curl http://localhost:8000/health
```

### Basic News Request

```bash
curl "http://localhost:8000/api/v1/news?limit=5"
```

---

## 🔐 Authentication

Currently, the API is **public** for news endpoints and **unprotected** for admin endpoints in development.

> **Production Note**: Admin endpoints should be protected with authentication middleware.

---

## 📰 News Endpoints

### GET /api/v1/news

Get paginated news articles with optional filtering.

#### Parameters

| Parameter    | Type   | Required | Validation  | Description                                          |
| ------------ | ------ | -------- | ----------- | ---------------------------------------------------- |
| `page`       | number | No       | 1-1000      | Page number (default: 1)                             |
| `limit`      | number | No       | 1-100       | Items per page (default: 20)                         |
| `celebrity`  | string | No       | 2-50 chars  | Filter by celebrity name                             |
| `sortBy`     | string | No       | enum        | Sort field: `publishedAt`, `relevancy`, `popularity` |
| `sortOrder`  | string | No       | enum        | Sort order: `asc`, `desc`                            |
| `searchTerm` | string | No       | 2-100 chars | Search in title/description                          |
| `sentiment`  | string | No       | enum        | Filter by: `positive`, `negative`, `neutral`         |
| `dateFrom`   | date   | No       | ISO date    | Start date (max 2 years ago)                         |
| `dateTo`     | date   | No       | ISO date    | End date (cannot be future)                          |
| `source`     | string | No       | enum        | Search source: `database` (default), `live`          |

#### Validation Rules

- **Date Range**: Cannot exceed 1 year span
- **Search Query**: Sanitized for security, no special characters
- **Live Search**: Requires `celebrity` parameter
- **Pagination**: Maximum 100 items per page to prevent resource exhaustion

#### Examples

**Basic Request**

```bash
curl "http://localhost:8000/api/v1/news"
```

**Celebrity Filter**

```bash
curl "http://localhost:8000/api/v1/news?celebrity=Anitta&limit=10"
```

**Date Range Filter**

```bash
curl "http://localhost:8000/api/v1/news?dateFrom=2024-01-01&dateTo=2024-12-31"
```

**Live Search** (requires celebrity)

```bash
curl "http://localhost:8000/api/v1/news?celebrity=Anitta&source=live"
```

**Text Search**

```bash
curl "http://localhost:8000/api/v1/news?searchTerm=música&sentiment=positive"
```

#### Response

```json
{
  "success": true,
  "data": {
    "articles": [
      {
        "id": "article-url",
        "title": "Article Title",
        "description": "Article description...",
        "url": "https://source.com/article",
        "urlToImage": "https://source.com/image.jpg",
        "publishedAt": "2024-01-15T10:30:00Z",
        "source": {
          "id": "source-id",
          "name": "Source Name"
        },
        "celebrity": "Celebrity Name",
        "sentiment": "positive",
        "isActive": true
      }
    ],
    "totalResults": 150,
    "page": 1,
    "totalPages": 8,
    "hasMore": true
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### GET /api/v1/news/search

Search articles with text query (same as main endpoint with searchTerm).

#### Parameters

Same as `/api/v1/news` but `searchTerm` or `q` is typically provided.

#### Example

```bash
curl "http://localhost:8000/api/v1/news/search?q=fashion&page=1&limit=10"
```

### GET /api/v1/news/trending

Get trending topics and celebrities.

#### Response

```json
{
  "success": true,
  "data": {
    "trending_celebrities": ["Anitta", "Bruna Marquezine", "Gisele Bündchen"],
    "trending_topics": ["fashion", "music", "beach"]
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## 👥 Celebrity Endpoints

### GET /api/v1/admin/celebrities

Get paginated list of celebrities with filtering.

#### Parameters

| Parameter   | Type    | Required | Validation | Description                                                        |
| ----------- | ------- | -------- | ---------- | ------------------------------------------------------------------ |
| `page`      | number  | No       | 1-1000     | Page number (default: 1)                                           |
| `limit`     | number  | No       | 1-100      | Items per page (default: 20)                                       |
| `isActive`  | boolean | No       | true/false | Filter by active status                                            |
| `sortBy`    | string  | No       | enum       | Sort by: `name`, `totalArticles`, `avgArticlesPerDay`, `createdAt` |
| `sortOrder` | string  | No       | enum       | Sort order: `asc`, `desc`                                          |

#### Example

```bash
curl "http://localhost:8000/api/v1/admin/celebrities?isActive=true&sortBy=totalArticles&sortOrder=desc"
```

### GET /api/v1/admin/celebrities/search

Search celebrities by name or aliases.

#### Parameters

| Parameter | Type   | Required | Validation  | Description    |
| --------- | ------ | -------- | ----------- | -------------- |
| `q`       | string | Yes      | 2-100 chars | Search query   |
| `page`    | number | No       | 1-1000      | Page number    |
| `limit`   | number | No       | 1-100       | Items per page |

#### Example

```bash
curl "http://localhost:8000/api/v1/admin/celebrities/search?q=Anitta"
```

### GET /api/v1/admin/celebrities/:id

Get celebrity by ID.

#### Example

```bash
curl "http://localhost:8000/api/v1/admin/celebrities/507f1f77bcf86cd799439011"
```

### POST /api/v1/admin/celebrities

Create new celebrity.

#### Request Body

```json
{
  "name": "Celebrity Name",
  "aliases": ["Nickname1", "Nickname2"]
}
```

### PUT /api/v1/admin/celebrities/:id

Update celebrity.

### DELETE /api/v1/admin/celebrities/:id

Delete celebrity (sets isActive to false).

---

## ⚙️ Admin Endpoints

### Fetch Management

#### POST /api/v1/admin/fetch/trigger

Manually trigger news fetch.

```bash
curl -X POST "http://localhost:8000/api/v1/admin/fetch/trigger"
```

#### POST /api/v1/admin/fetch-now

Simple fetch trigger (development only).

```bash
curl -X POST "http://localhost:8000/api/v1/admin/fetch-now"
```

#### GET /api/v1/admin/fetch/status

Get fetch job status and history.

#### GET /api/v1/admin/fetch/logs

Get detailed fetch logs with pagination.

#### Parameters

| Parameter | Type   | Validation | Description                               |
| --------- | ------ | ---------- | ----------------------------------------- |
| `page`    | number | 1-1000     | Page number                               |
| `limit`   | number | 1-100      | Items per page                            |
| `status`  | string | enum       | Filter by: `success`, `failed`, `partial` |

```bash
curl "http://localhost:8000/api/v1/admin/fetch/logs?status=success&page=1&limit=20"
```

### Cache Management

#### POST /api/v1/admin/cache/clear

Clear all cache.

```bash
curl -X POST "http://localhost:8000/api/v1/admin/cache/clear"
```

#### POST /api/v1/admin/cache/clear/news

Clear only news-related cache.

#### GET /api/v1/admin/cache/stats

Get cache statistics.

---

## 🔑 API Key Management

### GET /api/v1/admin/keys/status

Get comprehensive API key health status.

#### Response

```json
{
  "success": true,
  "data": {
    "keyStatuses": [
      {
        "keyId": "key-1",
        "isHealthy": true,
        "healthScore": 95,
        "totalRequests": 1500,
        "successfulRequests": 1425,
        "rateLimitedRequests": 75,
        "lastUsed": "2024-01-15T10:30:00Z",
        "dailyUsage": 150
      }
    ],
    "healthSummary": {
      "totalKeys": 3,
      "healthyKeys": 2,
      "averageHealthScore": 85,
      "recommendedKey": "key-1"
    }
  }
}
```

### POST /api/v1/admin/keys/health-check

Force health check on all API keys.

```bash
curl -X POST "http://localhost:8000/api/v1/admin/keys/health-check"
```

### POST /api/v1/admin/keys/reset-stats

Reset daily API key usage statistics.

```bash
curl -X POST "http://localhost:8000/api/v1/admin/keys/reset-stats"
```

### GET /api/v1/admin/keys/best

Get current best API key recommendation.

---

## 🛡️ Validation Rules

### Pagination Validation

```typescript
validatePagination();
```

- **page**: Must be integer between 1-1000
- **limit**: Must be integer between 1-100
- **Purpose**: Prevents resource exhaustion and excessive pagination

### Date Range Validation

```typescript
validateDateRange();
```

- **dateFrom**: Cannot be more than 2 years in the past
- **dateTo**: Cannot be in the future
- **Range**: Maximum 1 year span between dates
- **Format**: Must be valid ISO date string

### Search Validation

```typescript
validateSearch();
```

- **Length**: 2-100 characters
- **Sanitization**: Removes dangerous characters: `<>{}[]\`
- **Security**: Prevents injection attacks
- **Encoding**: Proper URL encoding required

### Celebrity Name Validation

```typescript
validateCelebrityName();
```

- **Length**: 2-50 characters
- **Type**: Must be string
- **Purpose**: Ensures reasonable celebrity name format

### Sentiment Validation

```typescript
validateSentiment();
```

- **Values**: Only `positive`, `negative`, `neutral`
- **Type**: Must be string
- **Case**: Case-sensitive

### Sorting Validation

```typescript
validateSorting(allowedFields);
```

- **sortBy**: Must be in allowed fields list
- **sortOrder**: Only `asc` or `desc`
- **Type Safety**: Prevents SQL injection

---

## 📊 Response Formats

### Success Response

```json
{
  "success": true,
  "data": {
    // Response data here
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Paginated Response

```json
{
  "success": true,
  "data": {
    "items": [...],
    "totalResults": 150,
    "page": 1,
    "totalPages": 8,
    "hasMore": true
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## ❌ Error Handling

### Validation Error (400)

```json
{
  "success": false,
  "error": "Page must be a positive integer",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Not Found Error (404)

```json
{
  "success": false,
  "error": "Celebrity not found",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Server Error (500)

```json
{
  "success": false,
  "error": "Internal server error",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Rate Limit Error (429)

```json
{
  "success": false,
  "error": "Too many requests. Please try again later.",
  "retryAfter": 60,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## 📈 Rate Limiting

### News Endpoints

- **Limit**: 100 requests per 15 minutes per IP
- **Window**: Rolling window
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

### Admin Endpoints

- **Limit**: 50 requests per 15 minutes per IP
- **Purpose**: Prevent admin endpoint abuse

### Live Search

- **Client-side**: 5 searches per day per user (localStorage)
- **Server-side**: Standard rate limiting applies
- **Purpose**: Preserve NewsAPI quota

---

## 🔧 Development Tools

### Manual Testing

```bash
# Health check
curl http://localhost:8000/health

# Basic news
curl "http://localhost:8000/api/v1/news?limit=5"

# Test validation (should fail)
curl "http://localhost:8000/api/v1/news?page=0&limit=200"

# Test live search
curl "http://localhost:8000/api/v1/news?celebrity=Anitta&source=live"

# API key status
curl "http://localhost:8000/api/v1/admin/keys/status"
```

### Response Headers

```
Content-Type: application/json
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248000
```

---

## 📝 Changelog

### v2.0.0 - Phase 1-3 Optimizations

- ✅ Added comprehensive input validation
- ✅ Implemented dual search system
- ✅ Added API key management endpoints
- ✅ Enhanced error handling and responses
- ✅ Added rate limiting with proper headers
- ✅ Improved pagination with strict limits

### v1.0.0 - Initial Release

- ✅ Basic news endpoints
- ✅ Celebrity management
- ✅ Admin functionality
- ✅ Cache management

---

_This documentation is automatically updated with each API version. Last updated: Phase 3 Documentation Consolidation_
