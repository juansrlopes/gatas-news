# 🌐 Gatas News - Frontend

> Modern, responsive Next.js frontend for the Gatas News platform

[![Next.js](https://img.shields.io/badge/Next.js-15.5.2-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0+-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react)](https://reactjs.org/)

## 📋 Table of Contents

- [🎯 Overview](#-overview)
- [🏗️ Architecture](#️-architecture)
- [🚀 Quick Start](#-quick-start)
- [📦 Components](#-components)
- [🔧 Development](#-development)
- [🧪 Testing](#-testing)
- [📱 Responsive Design](#-responsive-design)
- [🔒 Security](#-security)
- [⚡ Performance](#-performance)
- [🚀 Deployment](#-deployment)
- [🐛 Troubleshooting](#-troubleshooting)

## 🎯 Overview

The Gatas News frontend is a modern, responsive web application built with Next.js that provides:

- **📰 News Browsing**: Elegant grid layout for celebrity news articles
- **🔍 Smart Search**: Real-time filtering by celebrity names
- **📱 Mobile-First**: Responsive design that works on all devices
- **⚡ Performance**: Optimized images, caching, and loading states
- **🛡️ Reliability**: Comprehensive error handling and offline support
- **♿ Accessibility**: WCAG compliant with proper ARIA labels

## 🏗️ Architecture

### **Tech Stack**

```
Frontend Framework: Next.js 15.5.2 (App Router)
Language: TypeScript 5.0+
Styling: Tailwind CSS 3.0+
State Management: React Hooks (useState, useEffect)
Image Optimization: Next.js Image + Custom Proxy
Error Handling: React Error Boundaries
HTTP Client: Fetch API with timeout/retry logic
```

### **Project Structure**

```
apps/frontend/
├── public/                 # Static assets
│   ├── favicon.ico        # App icons
│   ├── placeholder-news.svg # Fallback image
│   └── robots.txt         # SEO configuration
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── NewsGrid.tsx   # Main news display component
│   │   ├── ErrorBoundary.tsx # Error handling wrapper
│   │   ├── Header.tsx     # Site navigation
│   │   └── LoadingSkeleton.tsx # Loading states
│   ├── pages/            # Next.js pages and API routes
│   │   ├── api/          # API routes (image proxy)
│   │   ├── _app.tsx      # App wrapper with error boundary
│   │   ├── index.tsx     # Home page
│   │   ├── about.tsx     # About page
│   │   └── 404.tsx       # Custom 404 page
│   ├── types/            # TypeScript type definitions
│   └── styles/           # Global styles
├── next.config.ts        # Next.js configuration
├── tailwind.config.js    # Tailwind CSS configuration
└── tsconfig.json         # TypeScript configuration
```

### **Key Features**

#### **🔄 Smart Error Handling**

- **Network Detection**: Automatic online/offline detection
- **Retry Logic**: Exponential backoff with user-friendly retry buttons
- **Timeout Protection**: 15-second request timeout with graceful fallback
- **Error Boundaries**: Comprehensive error catching with recovery options

#### **🖼️ Secure Image Proxy**

- **SSRF Protection**: Whitelist of allowed news domains
- **Content Validation**: Image type and size validation
- **Caching**: 24-hour cache with proper headers
- **Fallback**: Custom SVG placeholder for failed images

#### **📱 Responsive Design**

- **Mobile-First**: Optimized for mobile devices
- **Flexible Grid**: 1-5 columns based on screen size
- **Touch-Friendly**: Large tap targets and smooth animations
- **Accessibility**: Proper focus management and ARIA labels

## 🚀 Quick Start

### **Prerequisites**

- Node.js 18+ and npm
- Backend API running on port 8000 (see `apps/api/README.md`)

### **Installation**

```bash
# From project root
cd apps/frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### **Environment Setup**

The frontend uses shared environment configuration from `libs/shared/utils`. Key variables:

```bash
# In apps/api/.env (shared with backend)
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME="Gatas News"
NEXT_PUBLIC_APP_DESCRIPTION="Portal de notícias sobre celebridades"
```

### **Development URLs**

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Image Proxy**: http://localhost:3000/api/image-proxy

## 📦 Components

### **Core Components**

#### **NewsGrid** (`src/components/NewsGrid.tsx`)

Main component for displaying news articles with search functionality.

**Features:**

- Real-time search filtering
- Infinite scroll pagination
- Network connectivity detection
- Comprehensive error handling with retry
- Loading states and skeletons

**Props:** None (self-contained)

**Usage:**

```tsx
import NewsGrid from '../components/NewsGrid';

<NewsGrid />;
```

#### **ErrorBoundary** (`src/components/ErrorBoundary.tsx`)

Enterprise-grade error boundary with recovery options.

**Features:**

- Automatic error catching and logging
- Multiple recovery options (retry, reload, go back)
- Development error details
- Unique error IDs for support
- Sentry integration ready

**Props:**

```tsx
interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}
```

**Usage:**

```tsx
<ErrorBoundary onError={error => console.log(error)}>
  <YourComponent />
</ErrorBoundary>
```

#### **LoadingSkeleton** (`src/components/LoadingSkeleton.tsx`)

Animated loading placeholders for better UX.

**Components:**

- `LoadingSkeleton`: Basic skeleton component
- `ArticleSkeleton`: News article loading state
- `InstagramSkeleton`: Social media loading state

**Usage:**

```tsx
import { ArticleSkeleton } from './LoadingSkeleton';

{
  loading && <ArticleSkeleton count={8} />;
}
```

### **API Routes**

#### **Image Proxy** (`src/pages/api/image-proxy.ts`)

Secure image proxy with SSRF protection.

**Features:**

- Domain whitelist for security
- HTTPS-only enforcement
- Content-Type validation
- 5MB size limit with 10s timeout
- Proper caching headers

**Usage:**

```
GET /api/image-proxy?url=https://example.com/image.jpg
```

## 🔧 Development

### **Available Scripts**

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server
npm run lint            # Run ESLint
npm run type-check      # TypeScript type checking

# Testing (when implemented)
npm run test            # Run tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Generate coverage report

# Analysis
npm run analyze         # Bundle size analysis
npm run lighthouse      # Performance audit
```

### **Development Workflow**

1. **Start Backend**: Ensure API is running on port 8000
2. **Start Frontend**: `npm run dev` in `apps/frontend`
3. **Code Changes**: Hot reload automatically updates
4. **Type Checking**: Use `npm run type-check` for TypeScript validation
5. **Linting**: Run `npm run lint` before committing

### **Code Style**

- **TypeScript**: Strict mode enabled
- **ESLint**: Next.js recommended rules
- **Prettier**: Automatic code formatting
- **Tailwind**: Utility-first CSS classes
- **Components**: Functional components with hooks

### **State Management**

- **Local State**: `useState` for component-specific state
- **Side Effects**: `useEffect` for API calls and subscriptions
- **Memoization**: `useCallback` and `useMemo` for optimization
- **Error State**: Comprehensive error handling in each component

## 🧪 Testing

### **Testing Strategy** (To be implemented)

```bash
# Unit Tests
- Component rendering
- User interactions
- Error scenarios
- API integration

# Integration Tests
- Page navigation
- Form submissions
- Error boundaries
- Image loading

# E2E Tests
- Complete user flows
- Cross-browser testing
- Mobile responsiveness
- Performance benchmarks
```

### **Testing Tools** (Planned)

- **Jest**: Test runner and assertions
- **React Testing Library**: Component testing
- **MSW**: API mocking
- **Playwright**: E2E testing

## 📱 Responsive Design

### **Breakpoints**

```css
sm: 640px   /* Small tablets */
md: 768px   /* Tablets */
lg: 1024px  /* Small desktops */
xl: 1280px  /* Large desktops */
2xl: 1536px /* Extra large screens */
```

### **Grid Layout**

- **Mobile (default)**: 1 column
- **Small (sm)**: 2 columns
- **Medium (md)**: 3 columns
- **Large (lg)**: 4 columns
- **Extra Large (xl)**: 5 columns

### **Touch Interactions**

- **Tap Targets**: Minimum 44px for accessibility
- **Hover Effects**: Disabled on touch devices
- **Scroll Behavior**: Smooth scrolling with momentum
- **Gestures**: Pull-to-refresh support (planned)

## 🔒 Security

### **Security Measures**

- **Input Sanitization**: HTML tag stripping in search queries
- **SSRF Protection**: Image proxy domain whitelist
- **Content Security Policy**: Secure SVG handling
- **HTTPS Enforcement**: All external requests use HTTPS
- **XSS Prevention**: Proper data escaping and validation

### **Image Security**

- **Domain Whitelist**: Only trusted news sources
- **Content Validation**: Image type verification
- **Size Limits**: 5MB maximum file size
- **Timeout Protection**: 10-second request timeout

## ⚡ Performance

### **Optimization Techniques**

- **Image Optimization**: Next.js Image component with lazy loading
- **Code Splitting**: Automatic route-based splitting
- **Caching**: 24-hour image cache with proper headers
- **Compression**: Gzip/Brotli compression enabled
- **Bundle Analysis**: Regular size monitoring

### **Performance Metrics**

- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **Time to Interactive**: < 3.5s

### **Loading Strategies**

- **Critical CSS**: Inlined for faster rendering
- **Lazy Loading**: Images load on scroll
- **Prefetching**: Next.js automatic prefetching
- **Service Worker**: Offline caching (planned)

## 🚀 Deployment

### **Vercel (Recommended)**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from frontend directory
cd apps/frontend
vercel

# Production deployment
vercel --prod
```

### **Netlify**

```bash
# Build settings
Build command: npm run build
Publish directory: .next
```

### **Docker**

```dockerfile
# Dockerfile example
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### **Environment Variables**

```bash
# Production environment
NEXT_PUBLIC_API_URL=https://your-api-domain.com
NEXT_PUBLIC_APP_NAME="Gatas News"
NODE_ENV=production
```

## 🐛 Troubleshooting

### **Common Issues**

#### **Build Errors**

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Type check
npm run type-check
```

#### **API Connection Issues**

```bash
# Check API status
curl http://localhost:8000/health

# Verify environment variables
echo $NEXT_PUBLIC_API_URL

# Check network connectivity
ping localhost
```

#### **Image Loading Problems**

```bash
# Check image proxy
curl "http://localhost:3000/api/image-proxy?url=https://images.unsplash.com/test.jpg"

# Verify domain whitelist in image-proxy.ts
# Check browser console for CORS errors
```

#### **Performance Issues**

```bash
# Analyze bundle size
npm run analyze

# Check for memory leaks
# Use React DevTools Profiler
# Monitor Network tab in DevTools
```

### **Debug Mode**

```bash
# Enable debug logging
DEBUG=* npm run dev

# TypeScript strict mode
# Check tsconfig.json "strict": true

# React strict mode
# Enabled in _app.tsx
```

### **Getting Help**

1. **Check Console**: Browser DevTools → Console tab
2. **Network Tab**: Check API requests and responses
3. **React DevTools**: Install browser extension for component debugging
4. **Error Boundaries**: Check error IDs in production
5. **GitHub Issues**: Report bugs with error details

---

## 🤝 Contributing

See the main [CONTRIBUTING.md](../../CONTRIBUTING.md) for contribution guidelines.

### **Frontend-Specific Guidelines**

- Use TypeScript for all new code
- Follow existing component patterns
- Add JSDoc comments for complex functions
- Test on mobile devices
- Ensure accessibility compliance

---

## 📄 License

This project is part of the Gatas News platform. See the main README for license information.

---

**Made with ❤️ by the Gatas News team**
