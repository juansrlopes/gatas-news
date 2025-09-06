# 🛠️ Frontend Development Guide

> Quick reference guide for developers working on the Gatas News frontend

## 📋 Table of Contents

- [🚀 Quick Start](#-quick-start)
- [🏗️ Project Structure](#️-project-structure)
- [🔧 Development Workflow](#-development-workflow)
- [🧪 Testing Guide](#-testing-guide)
- [🎨 Component Guidelines](#-component-guidelines)
- [📱 Responsive Design](#-responsive-design)
- [⚡ Performance Tips](#-performance-tips)
- [🔒 Security Guidelines](#-security-guidelines)
- [🐛 Debugging](#-debugging)
- [📦 Build & Deploy](#-build--deploy)

## 🚀 Quick Start

### **Prerequisites**

```bash
# Required
Node.js 18+
npm 8+

# Backend API running on port 8000
cd apps/api && npm run dev
```

### **Development Setup**

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run frontend:dev
# or from root: npm run dev

# 3. Open browser
open http://localhost:3000
```

### **Essential Commands**

```bash
# Development
npm run frontend:dev          # Start dev server
npm run frontend:build        # Build for production
npm run frontend:lint         # Run linting
npm run frontend:type-check   # TypeScript validation
npm run frontend:test         # Run tests

# Debugging
npm run frontend:clean        # Clear cache
npm run kill:frontend         # Kill port 3000 processes
```

## 🏗️ Project Structure

```
apps/frontend/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── NewsGrid.tsx     # Main news display
│   │   ├── ErrorBoundary.tsx # Error handling
│   │   ├── LoadingSkeleton.tsx # Loading states
│   │   └── __tests__/       # Component tests
│   ├── pages/               # Next.js pages
│   │   ├── api/             # API routes
│   │   ├── index.tsx        # Home page
│   │   └── _app.tsx         # App wrapper
│   ├── types/               # TypeScript definitions
│   ├── utils/               # Utility functions
│   ├── test/                # Test utilities
│   └── styles/              # Global styles
├── public/                  # Static assets
├── next.config.ts           # Next.js configuration
├── tailwind.config.js       # Tailwind CSS config
└── jest.config.js           # Jest test config
```

### **Key Files**

- **`NewsGrid.tsx`** - Main component with search, pagination, error handling
- **`ErrorBoundary.tsx`** - Catches and handles React errors
- **`image-proxy.ts`** - Secure image proxy API route
- **`next.config.ts`** - Build configuration and image domains

## 🔧 Development Workflow

### **1. Starting Development**

```bash
# Terminal 1: Start backend API
cd apps/api && npm run dev

# Terminal 2: Start frontend
cd apps/frontend && npm run dev

# Terminal 3: Watch tests (optional)
npm run frontend:test:watch
```

### **2. Making Changes**

1. **Create feature branch**: `git checkout -b feature/new-component`
2. **Write code**: Follow component guidelines below
3. **Add tests**: Write tests for new functionality
4. **Run checks**: `npm run frontend:lint && npm run frontend:type-check`
5. **Test manually**: Verify in browser
6. **Commit**: Use conventional commits

### **3. Code Review Checklist**

- [ ] TypeScript types are properly defined
- [ ] Components have JSDoc comments
- [ ] Tests cover new functionality
- [ ] Responsive design works on mobile
- [ ] Accessibility attributes are present
- [ ] Error handling is implemented
- [ ] Loading states are handled

## 🧪 Testing Guide

### **Test Structure**

```bash
src/
├── components/
│   ├── NewsGrid.tsx
│   └── __tests__/
│       └── NewsGrid.test.tsx    # Component tests
├── test/
│   ├── setup.ts                 # Jest configuration
│   ├── utils/
│   │   ├── mockData.ts         # Mock data factories
│   │   └── testHelpers.tsx     # Testing utilities
│   └── __mocks__/
│       └── fileMock.js         # File mocks
```

### **Writing Tests**

```tsx
import { renderWithProviders, setupUser, mockFetch } from '../test/utils/testHelpers';
import { createMockArticles } from '../test/utils/mockData';
import NewsGrid from '../NewsGrid';

describe('NewsGrid', () => {
  it('displays articles after successful fetch', async () => {
    const mockArticles = createMockArticles(3);
    mockFetch.mockSuccess({ data: { articles: mockArticles } });

    renderWithProviders(<NewsGrid />);

    await waitFor(() => {
      expect(screen.getByText(mockArticles[0].title)).toBeInTheDocument();
    });
  });
});
```

### **Test Categories**

- **Unit Tests**: Individual component behavior
- **Integration Tests**: Component interactions
- **API Tests**: Mock API responses
- **Accessibility Tests**: ARIA labels, keyboard navigation
- **Error Tests**: Error boundaries and error states

### **Running Tests**

```bash
# All tests
npm run frontend:test

# Watch mode
npm run frontend:test:watch

# Coverage report
npm run frontend:test:coverage

# Specific test file
npm test NewsGrid.test.tsx
```

## 🎨 Component Guidelines

### **Component Structure**

````tsx
/**
 * Component Description
 *
 * Detailed explanation of what the component does,
 * its features, and usage examples.
 *
 * @component
 * @example
 * ```tsx
 * <MyComponent prop="value" />
 * ```
 */
import React from 'react';

interface MyComponentProps {
  /** Description of prop */
  prop: string;
  /** Optional prop with default */
  optional?: boolean;
}

const MyComponent: React.FC<MyComponentProps> = ({ prop, optional = false }) => {
  return <div className="component-styles">{/* Component content */}</div>;
};

export default MyComponent;
````

### **Naming Conventions**

- **Components**: PascalCase (`NewsGrid`, `ErrorBoundary`)
- **Files**: PascalCase for components (`NewsGrid.tsx`)
- **Props**: camelCase (`isLoading`, `onRetry`)
- **CSS Classes**: Tailwind utilities
- **Test Files**: `ComponentName.test.tsx`

### **State Management**

```tsx
// Local state with hooks
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');

// Memoized callbacks
const handleSearch = useCallback(
  (query: string) => {
    // Implementation
  },
  [dependency]
);

// Effects with cleanup
useEffect(() => {
  const controller = new AbortController();

  fetchData(controller.signal);

  return () => controller.abort();
}, []);
```

### **Error Handling**

```tsx
// Component-level error handling
const [error, setError] = useState('');

try {
  await apiCall();
} catch (err) {
  setError(err instanceof Error ? err.message : 'Unknown error');
}

// Error boundary usage
<ErrorBoundary onError={handleError}>
  <Component />
</ErrorBoundary>;
```

## 📱 Responsive Design

### **Breakpoints**

```css
/* Tailwind breakpoints */
sm: 640px   /* Small tablets */
md: 768px   /* Tablets */
lg: 1024px  /* Small desktops */
xl: 1280px  /* Large desktops */
2xl: 1536px /* Extra large */
```

### **Responsive Patterns**

```tsx
// Grid layout
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">

// Conditional rendering
<div className="hidden md:block">Desktop only</div>
<div className="block md:hidden">Mobile only</div>

// Responsive text
<h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl">

// Responsive spacing
<div className="p-2 sm:p-4 md:p-6 lg:p-8">
```

### **Mobile-First Approach**

1. Design for mobile first (320px+)
2. Add tablet styles (`sm:` prefix)
3. Add desktop styles (`md:`, `lg:`, `xl:`)
4. Test on real devices
5. Use touch-friendly tap targets (44px minimum)

## ⚡ Performance Tips

### **Image Optimization**

```tsx
// Use Next.js Image component
import Image from 'next/image';

<Image
  src="/api/image-proxy?url=..."
  alt="Description"
  width={500}
  height={300}
  placeholder="blur"
  blurDataURL="data:image/..."
  loading="lazy"
/>;
```

### **Code Splitting**

```tsx
// Dynamic imports for large components
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <LoadingSkeleton />,
  ssr: false, // Client-side only if needed
});
```

### **Memoization**

```tsx
// Memoize expensive calculations
const expensiveValue = useMemo(() => {
  return heavyCalculation(data);
}, [data]);

// Memoize callbacks
const handleClick = useCallback(
  (id: string) => {
    onClick(id);
  },
  [onClick]
);

// Memoize components
const MemoizedComponent = memo(({ prop }) => {
  return <div>{prop}</div>;
});
```

### **Bundle Analysis**

```bash
# Analyze bundle size
npm run frontend:analyze

# Check for duplicate dependencies
npx depcheck

# Audit performance
npm run frontend:lighthouse
```

## 🔒 Security Guidelines

### **Input Sanitization**

```tsx
// Sanitize user input
const sanitizedInput = input.trim().replace(/[<>]/g, '');

// Validate URLs
const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return url.startsWith('https://');
  } catch {
    return false;
  }
};
```

### **XSS Prevention**

```tsx
// Use dangerouslySetInnerHTML carefully
<div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />

// Prefer text content over HTML
<div>{userContent}</div> // Safe
```

### **API Security**

```tsx
// Always validate API responses
const validateArticle = (article: any): article is Article => {
  return (
    typeof article.title === 'string' &&
    typeof article.url === 'string' &&
    article.title.trim() !== ''
  );
};

// Use HTTPS only
const apiUrl = url.startsWith('https://') ? url : null;
```

## 🐛 Debugging

### **Development Tools**

```tsx
// Use dev tools (available in console)
window.devTools.log.component('NewsGrid', props);
window.devTools.performance.start('api-call');
window.devTools.memory.log('after-render');
```

### **Console Debugging**

```tsx
// Conditional logging
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info:', data);
}

// Error logging with context
console.error('API Error:', {
  url,
  status: response.status,
  error: error.message,
});
```

### **React DevTools**

1. Install React DevTools browser extension
2. Use Profiler tab for performance analysis
3. Inspect component props and state
4. Track re-renders and updates

### **Network Debugging**

```bash
# Check API connectivity
curl http://localhost:8000/health

# Test image proxy
curl "http://localhost:3000/api/image-proxy?url=https://example.com/image.jpg"

# Monitor network requests
# Use browser DevTools Network tab
```

### **Common Issues**

| Issue              | Solution                                         |
| ------------------ | ------------------------------------------------ |
| Hydration mismatch | Check server/client rendering differences        |
| Images not loading | Verify image proxy and domains in next.config.ts |
| API errors         | Check backend is running on port 8000            |
| Slow loading       | Use React Profiler to identify bottlenecks       |
| Memory leaks       | Check for uncleared intervals/timeouts           |

## 📦 Build & Deploy

### **Build Process**

```bash
# Development build
npm run frontend:build

# Production build with optimizations
NODE_ENV=production npm run frontend:build

# Analyze bundle
ANALYZE=true npm run frontend:build
```

### **Environment Variables**

```bash
# .env.local (not committed)
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME="Gatas News"

# Production
NEXT_PUBLIC_API_URL=https://api.gatasnews.com
```

### **Deployment Checklist**

- [ ] All tests pass
- [ ] TypeScript compiles without errors
- [ ] Bundle size is acceptable
- [ ] Images load correctly
- [ ] API endpoints are configured
- [ ] Error boundaries catch errors
- [ ] Performance metrics are good
- [ ] Accessibility is tested

### **Vercel Deployment**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd apps/frontend
vercel

# Production deployment
vercel --prod
```

### **Performance Monitoring**

```bash
# Lighthouse CI
npm run frontend:lighthouse

# Bundle analyzer
npm run frontend:analyze

# Check Core Web Vitals
# Use Google PageSpeed Insights
```

---

## 🤝 Getting Help

### **Resources**

- **Main README**: `apps/frontend/README.md`
- **API Documentation**: `apps/api/README.md`
- **Contributing Guide**: `CONTRIBUTING.md`
- **Troubleshooting**: `apps/frontend/TROUBLESHOOTING.md`

### **Common Commands Reference**

```bash
# Development
npm run frontend:dev              # Start dev server
npm run frontend:test:watch       # Watch tests
npm run frontend:lint             # Check code style

# Debugging
npm run frontend:clean            # Clear cache
npm run kill:frontend             # Kill processes
npm run frontend:type-check       # Check types

# Production
npm run frontend:build            # Build for production
npm run frontend:preview          # Preview build locally
```

---

**Happy coding! 🚀**
