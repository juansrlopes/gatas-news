# 🔧 Frontend Troubleshooting Guide

> Solutions for common issues when developing the Gatas News frontend

## 📋 Table of Contents

- [🚀 Quick Fixes](#-quick-fixes)
- [🏗️ Build Issues](#️-build-issues)
- [🌐 API Connection Problems](#-api-connection-problems)
- [🖼️ Image Loading Issues](#️-image-loading-issues)
- [🧪 Testing Problems](#-testing-problems)
- [⚡ Performance Issues](#-performance-issues)
- [📱 Mobile/Responsive Issues](#-mobileresponsive-issues)
- [🔒 Security Warnings](#-security-warnings)
- [🐛 Runtime Errors](#-runtime-errors)
- [💾 Cache Issues](#-cache-issues)

## 🚀 Quick Fixes

### **App Won't Start**

```bash
# 1. Kill existing processes
npm run kill:frontend
npm run kill:port  # For API on port 8000

# 2. Clear cache and reinstall
npm run frontend:clean
rm -rf node_modules package-lock.json
npm install

# 3. Restart development server
npm run frontend:dev
```

### **"Module not found" Errors**

```bash
# Check if file exists
ls apps/frontend/src/components/NewsGrid.tsx

# Verify import path
# ❌ Wrong: import NewsGrid from './NewsGrid'
# ✅ Correct: import NewsGrid from '../components/NewsGrid'

# Clear Next.js cache
rm -rf apps/frontend/.next
npm run frontend:dev
```

### **TypeScript Errors**

```bash
# Check TypeScript compilation
npm run frontend:type-check

# Common fixes
# 1. Add missing type imports
import type { Article } from '../types';

# 2. Fix prop types
interface Props {
  articles: Article[];  // Not 'any'
}

# 3. Handle undefined values
const title = article?.title || 'No title';
```

## 🏗️ Build Issues

### **Build Fails with Memory Error**

```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm run frontend:build

# Or add to package.json
"build": "NODE_OPTIONS='--max-old-space-size=4096' next build"
```

### **"Cannot resolve module" During Build**

```bash
# Check next.config.ts webpack configuration
# Ensure path aliases are correct:
config.resolve.alias = {
  '@': path.join(__dirname, 'src'),
};

# Verify tsconfig.json paths match
"paths": {
  "@/*": ["./src/*"]
}
```

### **CSS/Tailwind Not Working**

```bash
# Check tailwind.config.js content paths
content: [
  './src/pages/**/*.{js,ts,jsx,tsx}',
  './src/components/**/*.{js,ts,jsx,tsx}',
],

# Verify globals.css imports Tailwind
@tailwind base;
@tailwind components;
@tailwind utilities;

# Clear cache and rebuild
rm -rf .next
npm run frontend:dev
```

## 🌐 API Connection Problems

### **"Failed to fetch" Errors**

```bash
# 1. Check if API is running
curl http://localhost:8000/health
# Should return: {"status":"ok","timestamp":"..."}

# 2. Verify API URL in environment
echo $NEXT_PUBLIC_API_URL
# Should be: http://localhost:8000

# 3. Check CORS settings in API
# API should allow localhost:3000 origin

# 4. Test API endpoint directly
curl "http://localhost:8000/api/v1/news?limit=5"
```

### **API Returns 404**

```bash
# Check API routes are correct
# Frontend calls: /api/v1/news
# API should have: GET /api/v1/news

# Verify API is running on correct port
lsof -i :8000
# Should show node process

# Check API logs
npm run logs:api
```

### **CORS Errors**

```javascript
// In API cors configuration (apps/api/src/server.ts)
app.use(
  cors({
    origin: ['http://localhost:3000', 'https://yourdomain.com'],
    credentials: true,
  })
);
```

### **Timeout Errors**

```typescript
// Increase timeout in NewsGrid.tsx
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s instead of 15s
```

## 🖼️ Image Loading Issues

### **Images Not Loading**

```bash
# 1. Check image proxy endpoint
curl "http://localhost:3000/api/image-proxy?url=https://images.unsplash.com/photo-123"

# 2. Verify domain whitelist in image-proxy.ts
const ALLOWED_DOMAINS = [
  'images.unsplash.com',
  'your-image-domain.com'  // Add your domain
];

# 3. Check Next.js image configuration
# In next.config.ts:
images: {
  domains: ['images.unsplash.com'],
  remotePatterns: [
    {
      protocol: 'https',
      hostname: '**',
    },
  ],
}
```

### **Image Proxy Errors**

```bash
# Check image proxy logs in browser console
# Common errors:
# - "Invalid or unauthorized URL" → Domain not in whitelist
# - "Request timeout" → Source image server slow
# - "Invalid content type" → URL doesn't point to image

# Test image URL directly
curl -I "https://example.com/image.jpg"
# Should return: Content-Type: image/jpeg
```

### **Placeholder Images Not Showing**

```bash
# Verify placeholder exists
ls apps/frontend/public/placeholder-news.svg

# Check SVG is valid
cat apps/frontend/public/placeholder-news.svg
# Should start with: <svg width="500" height="300"...

# Test placeholder in browser
open http://localhost:3000/placeholder-news.svg
```

## 🧪 Testing Problems

### **Tests Won't Run**

```bash
# Check Jest configuration
cat apps/frontend/jest.config.js

# Install missing dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom

# Clear Jest cache
npx jest --clearCache

# Run specific test
npm test -- NewsGrid.test.tsx
```

### **"Cannot find module" in Tests**

```javascript
// Check test setup file: src/test/setup.ts
// Ensure all mocks are properly configured

// Mock Next.js components
jest.mock('next/image', () => ({
  __esModule: true,
  default: props => <img {...props} />,
}));

// Mock environment config
jest.mock('../../../../libs/shared/utils/src/index', () => ({
  getEnvConfig: () => ({ apiUrl: 'http://localhost:8000' }),
}));
```

### **Tests Timeout**

```javascript
// Increase timeout in jest.config.js
module.exports = {
  testTimeout: 30000, // 30 seconds
};

// Or in specific test
describe('Component', () => {
  jest.setTimeout(30000);

  it('should work', async () => {
    // Test code
  });
});
```

### **Mock Fetch Not Working**

```javascript
// Ensure fetch is mocked in setup.ts
global.fetch = jest.fn();

// Reset mocks between tests
afterEach(() => {
  jest.clearAllMocks();
});

// Use helper functions
import { mockFetch } from '../test/utils/testHelpers';
mockFetch.mockSuccess({ data: { articles: [] } });
```

## ⚡ Performance Issues

### **Slow Loading/Rendering**

```bash
# 1. Analyze bundle size
npm run frontend:analyze

# 2. Check for large dependencies
npx webpack-bundle-analyzer .next/static/chunks/*.js

# 3. Use React Profiler
# Open React DevTools → Profiler tab
# Record interaction and analyze render times

# 4. Check for memory leaks
# Use browser DevTools → Memory tab
# Take heap snapshots before/after interactions
```

### **Large Bundle Size**

```javascript
// Use dynamic imports for large components
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <LoadingSkeleton />,
});

// Check for duplicate dependencies
npx depcheck
npx npm-check-updates

// Analyze what's in your bundle
npm run frontend:analyze
```

### **Slow API Responses**

```bash
# Check API performance
curl -w "@curl-format.txt" "http://localhost:8000/api/v1/news"

# Create curl-format.txt:
     time_namelookup:  %{time_namelookup}\n
        time_connect:  %{time_connect}\n
     time_appconnect:  %{time_appconnect}\n
    time_pretransfer:  %{time_pretransfer}\n
       time_redirect:  %{time_redirect}\n
  time_starttransfer:  %{time_starttransfer}\n
                     ----------\n
          time_total:  %{time_total}\n
```

## 📱 Mobile/Responsive Issues

### **Layout Broken on Mobile**

```css
/* Check viewport meta tag in _document.tsx */
<meta name="viewport" content="width=device-width, initial-scale=1" />

/* Test responsive classes */
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
  <!-- Should stack on mobile, 2 cols on tablet, 3 on desktop -->
</div>

/* Debug responsive breakpoints */
<div className="block sm:hidden">Mobile only</div>
<div className="hidden sm:block md:hidden">Tablet only</div>
<div className="hidden md:block">Desktop only</div>
```

### **Touch Interactions Not Working**

```css
/* Ensure touch targets are large enough */
.button {
  min-height: 44px; /* iOS recommendation */
  min-width: 44px;
}

/* Remove hover effects on touch devices */
@media (hover: hover) {
  .button:hover {
    background-color: blue;
  }
}
```

### **Horizontal Scroll Issues**

```css
/* Find elements causing overflow */
* {
  outline: 1px solid red; /* Temporary debug */
}

/* Common fixes */
.container {
  max-width: 100%;
  overflow-x: hidden;
}

/* Check for fixed widths */
/* ❌ Bad: width: 500px */
/* ✅ Good: max-width: 500px or w-full */
```

## 🔒 Security Warnings

### **"Unsafe eval" Errors**

```javascript
// Check Content Security Policy
// Remove unsafe-eval from CSP headers

// In next.config.ts for images:
images: {
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
}
```

### **XSS Warnings**

```typescript
// Never use dangerouslySetInnerHTML with user input
// ❌ Dangerous:
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ Safe:
<div>{userInput}</div>

// Sanitize if HTML is needed:
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(userInput);
```

### **HTTPS Mixed Content**

```javascript
// Ensure all external resources use HTTPS
// Check image URLs, API calls, fonts, etc.

// In image proxy, enforce HTTPS:
if (url.protocol !== 'https:') {
  return res.status(400).json({ error: 'HTTPS required' });
}
```

## 🐛 Runtime Errors

### **Hydration Mismatch**

```typescript
// Common cause: Server/client rendering differences
// ❌ Problem:
const [mounted, setMounted] = useState(false);
return mounted ? <ClientComponent /> : <ServerComponent />;

// ✅ Solution:
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
if (!mounted) return null;
return <ClientComponent />;
```

### **"Cannot read property of undefined"**

```typescript
// Use optional chaining and nullish coalescing
// ❌ Error-prone:
const title = article.title;

// ✅ Safe:
const title = article?.title ?? 'No title';

// For arrays:
const articles = data?.articles ?? [];
articles.map(article => /* ... */);
```

### **Memory Leaks**

```typescript
// Clean up subscriptions and timers
useEffect(() => {
  const timer = setInterval(() => {
    // Do something
  }, 1000);

  const controller = new AbortController();

  return () => {
    clearInterval(timer);
    controller.abort();
  };
}, []);
```

### **Error Boundary Not Catching**

```typescript
// Error boundaries only catch errors in:
// - Render methods
// - Lifecycle methods
// - Constructor

// They DON'T catch:
// - Event handlers (use try/catch)
// - Async code (use try/catch)
// - Server-side rendering
// - Errors in the error boundary itself

// ❌ Won't be caught:
const handleClick = () => {
  throw new Error('Not caught');
};

// ✅ Will be caught:
const ComponentThatThrows = () => {
  throw new Error('Caught by boundary');
};
```

## 💾 Cache Issues

### **Stale Data/Old Code**

```bash
# Clear all caches
npm run frontend:clean
rm -rf .next node_modules/.cache
npm install

# Clear browser cache
# Chrome: Cmd+Shift+R (hard refresh)
# Or: DevTools → Network → Disable cache

# Clear service worker (if any)
# DevTools → Application → Service Workers → Unregister
```

### **Environment Variables Not Updating**

```bash
# Restart development server after changing .env
# Environment variables are cached

# Check if variable is loaded
console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);

# Ensure variable starts with NEXT_PUBLIC_ for client-side access
```

### **Image Cache Issues**

```bash
# Clear image cache
rm -rf .next/cache/images

# Add cache busting to image URLs
const imageUrl = `/api/image-proxy?url=${encodeURIComponent(url)}&t=${Date.now()}`;

# Check cache headers in image-proxy.ts
res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour
```

---

## 🆘 Getting Help

### **Debug Information to Collect**

```bash
# System info
node --version
npm --version
cat package.json | grep version

# Error details
# - Full error message
# - Browser console logs
# - Network tab errors
# - Steps to reproduce

# Environment
echo $NODE_ENV
echo $NEXT_PUBLIC_API_URL
```

### **Useful Debug Commands**

```bash
# Check processes
lsof -i :3000  # Frontend
lsof -i :8000  # API

# Check logs
npm run logs:api
tail -f .next/trace

# Network debugging
curl -v http://localhost:8000/health
ping localhost
```

### **Where to Get Help**

1. **Check this guide first** 📖
2. **Search existing issues** on GitHub
3. **Check browser console** for errors
4. **Review component JSDoc** for usage examples
5. **Ask team members** with context and error details

---

**Remember: Most issues are environment-related. When in doubt, restart everything! 🔄**
