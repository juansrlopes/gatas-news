# 📦 Component Documentation

> Comprehensive guide to all components in the Gatas News frontend

## 📋 Table of Contents

- [🏗️ Component Architecture](#️-component-architecture)
- [📰 NewsGrid](#-newsgrid)
- [🚨 ErrorBoundary](#-errorboundary)
- [💀 LoadingSkeleton](#-loadingskeleton)
- [🧭 Header](#-header)
- [🔄 BackToTopButton](#-backtotopbutton)
- [📱 SocialMedia](#-socialmedia)
- [🎨 Usage Examples](#-usage-examples)
- [🧪 Testing Components](#-testing-components)

## 🏗️ Component Architecture

### **Design Principles**

- **Single Responsibility**: Each component has one clear purpose
- **Composition over Inheritance**: Build complex UIs from simple components
- **Props Interface**: Clear, typed interfaces for all props
- **Error Boundaries**: Graceful error handling at component level
- **Accessibility First**: ARIA labels, keyboard navigation, screen reader support

### **Component Hierarchy**

```
App (_app.tsx)
├── ErrorBoundary
│   ├── Header
│   └── Page Components
│       ├── NewsGrid
│       │   ├── LoadingSkeleton (ArticleSkeleton)
│       │   └── Individual Articles
│       ├── SocialMedia
│       │   └── LoadingSkeleton (InstagramSkeleton)
│       └── BackToTopButton
```

### **State Management Strategy**

- **Local State**: `useState` for component-specific state
- **Shared State**: Props drilling for simple cases
- **Side Effects**: `useEffect` with proper cleanup
- **Memoization**: `useCallback` and `useMemo` for performance

---

## 📰 NewsGrid

**Main component for displaying and managing news articles with search and pagination.**

### **Props**

```typescript
// NewsGrid has no props - it's self-contained
interface NewsGridProps {}
```

### **Features**

- ✅ Real-time search filtering by celebrity names
- ✅ Infinite scroll pagination with "Load More" button
- ✅ Network connectivity detection (online/offline)
- ✅ Comprehensive error handling with retry mechanisms
- ✅ Loading states with skeleton placeholders
- ✅ Input sanitization for security
- ✅ Responsive grid layout (1-5 columns)
- ✅ Image optimization with fallback placeholders
- ✅ Accessibility support (ARIA labels, keyboard navigation)

### **State Management**

```typescript
const [articles, setArticles] = useState<Article[]>([]); // Article list
const [query, setQuery] = useState(''); // Search query
const [loading, setLoading] = useState(false); // Loading state
const [error, setError] = useState(''); // Error message
const [page, setPage] = useState(1); // Current page
const [retryCount, setRetryCount] = useState(0); // Retry attempts
const [isOnline, setIsOnline] = useState(true); // Network status
const [lastFailedRequest, setLastFailedRequest] = useState<{
  page: number;
  celebrity: string;
} | null>(null); // Failed request info
```

### **Key Methods**

```typescript
// Fetch articles with error handling and retry logic
fetchArticles(pageNumber = 1, celebrityName = '', isRetry = false): Promise<void>

// Retry the last failed request
retryLastRequest(): void

// Load next page of articles
loadMoreArticles(): void

// Handle search form submission
handleSearch(): void

// Clear search input and show all articles
handleClearInput(): void

// Handle input changes
handleInputChange(e: React.ChangeEvent<HTMLInputElement>): void

// Handle Enter key press
handleKeyPress(e: React.KeyboardEvent<HTMLInputElement>): void
```

### **Usage Example**

```tsx
import NewsGrid from '../components/NewsGrid';

function HomePage() {
  return (
    <main>
      <NewsGrid />
    </main>
  );
}
```

### **Error Handling**

- **Network Errors**: Shows retry button with helpful messages
- **Timeout Errors**: 15-second timeout with specific error message
- **API Errors**: Different messages for 404, 500, etc.
- **Offline Detection**: Shows offline indicator and auto-retries when online
- **Input Validation**: Sanitizes search queries to prevent XSS

### **Performance Optimizations**

- **Memoized Callbacks**: `useCallback` for event handlers
- **Debounced Input**: Prevents excessive API calls
- **Image Lazy Loading**: Uses Next.js Image component
- **Skeleton Loading**: Provides immediate visual feedback

---

## 🚨 ErrorBoundary

**Enterprise-grade error boundary that catches JavaScript errors and provides recovery options.**

### **Props**

```typescript
interface ErrorBoundaryProps {
  children: ReactNode; // Components to wrap
  fallback?: ReactNode; // Custom error UI
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void; // Error callback
  resetOnPropsChange?: boolean; // Auto-reset on prop changes
  resetKeys?: Array<string | number>; // Keys that trigger reset
}
```

### **Features**

- ✅ Catches and displays JavaScript errors gracefully
- ✅ Multiple recovery options (retry, reload, go back)
- ✅ Unique error IDs for support tracking
- ✅ Development error details with stack traces
- ✅ Automatic reset on props/key changes
- ✅ Custom error handlers and fallback UI
- ✅ Sentry integration ready
- ✅ Accessibility compliant error display

### **State Management**

```typescript
interface ErrorBoundaryState {
  hasError: boolean; // Whether an error occurred
  error?: Error; // The error object
  errorInfo?: React.ErrorInfo; // React error info
  eventId?: string; // Unique error ID
}
```

### **Usage Examples**

```tsx
// Basic usage
<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>

// With custom error handler
<ErrorBoundary
  onError={(error, errorInfo) => {
    console.error('Component error:', error);
    // Send to error tracking service
  }}
>
  <YourComponent />
</ErrorBoundary>

// With auto-reset on data changes
<ErrorBoundary
  resetKeys={[userId, dataVersion]}
  resetOnPropsChange={true}
>
  <DataComponent userId={userId} />
</ErrorBoundary>

// With custom fallback UI
<ErrorBoundary
  fallback={
    <div className="error-fallback">
      <h2>Something went wrong</h2>
      <button onClick={() => window.location.reload()}>
        Reload Page
      </button>
    </div>
  }
>
  <YourComponent />
</ErrorBoundary>
```

### **Error Recovery Options**

1. **Retry**: Resets error state and re-renders component
2. **Reload**: Refreshes the entire page
3. **Go Back**: Uses browser history to go back
4. **Auto-Reset**: Automatically resets when props change

### **Development vs Production**

- **Development**: Shows detailed error information, stack traces
- **Production**: Shows user-friendly messages, hides technical details
- **Error IDs**: Always generated for support tracking

---

## 💀 LoadingSkeleton

**Animated loading placeholders that match the layout of actual content.**

### **Components**

#### **LoadingSkeleton**

Basic skeleton component for custom loading states.

```typescript
interface LoadingSkeletonProps {
  className?: string; // Additional CSS classes
}
```

#### **ArticleSkeleton**

Skeleton for news article grid layout.

```typescript
interface ArticleSkeletonProps {
  count?: number; // Number of skeleton articles (default: 6)
}
```

#### **InstagramSkeleton**

Skeleton for Instagram profile grid layout.

```typescript
interface InstagramSkeletonProps {
  count?: number; // Number of skeleton profiles (default: 10)
}
```

### **Usage Examples**

```tsx
import { LoadingSkeleton, ArticleSkeleton, InstagramSkeleton } from '../components/LoadingSkeleton';

// Basic skeleton
<LoadingSkeleton className="h-4 w-full mb-2" />
<LoadingSkeleton className="h-4 w-3/4" />

// Article loading state
{loading && <ArticleSkeleton count={8} />}

// Instagram loading state
{loading && <InstagramSkeleton count={12} />}

// Custom skeleton layout
<div className="space-y-2">
  <LoadingSkeleton className="h-6 w-1/2" />
  <LoadingSkeleton className="h-4 w-full" />
  <LoadingSkeleton className="h-4 w-3/4" />
  <LoadingSkeleton className="h-48 w-full rounded-lg" />
</div>
```

### **Design Principles**

- **Match Layout**: Skeletons match the exact layout of real content
- **Consistent Animation**: All skeletons use the same pulse animation
- **Responsive**: Skeletons adapt to different screen sizes
- **Accessible**: Don't interfere with screen readers

---

## 🧭 Header

**Main navigation header with logo, title, and navigation links.**

### **Props**

```typescript
// Header has no props - it uses static content
interface HeaderProps {}
```

### **Features**

- ✅ Responsive navigation layout
- ✅ Hover effects on navigation links
- ✅ Beta indicator for development phase
- ✅ Semantic HTML structure for accessibility
- ✅ Mobile-friendly design

### **Usage Example**

```tsx
import Header from '../components/Header';

function Layout({ children }) {
  return (
    <div>
      <Header />
      <main>{children}</main>
    </div>
  );
}
```

### **Navigation Structure**

- **Logo**: "Gatas News" with beta indicator
- **Tagline**: "O portal de notícias sobre as mulheres mais admiradas do mundo"
- **Links**:
  - "Insta das gatas" → `/social-media`
  - "Sobre" → `/about`

---

## 🔄 BackToTopButton

**Floating button that appears when user scrolls down and smoothly scrolls back to top.**

### **Props**

```typescript
// BackToTopButton has no props - it's self-contained
interface BackToTopButtonProps {}
```

### **Features**

- ✅ Appears when user scrolls down 300px
- ✅ Smooth scroll animation to top
- ✅ Accessible with proper ARIA labels
- ✅ Mobile-friendly touch target
- ✅ Fixed positioning that doesn't interfere with content

### **Usage Example**

```tsx
import BackToTopButton from '../components/BackToTopButton';

function Layout({ children }) {
  return (
    <div>
      <main>{children}</main>
      <BackToTopButton />
    </div>
  );
}
```

---

## 📱 SocialMedia

**Component for displaying Instagram profiles of celebrities.**

### **Props**

```typescript
// SocialMedia has no props - it loads data internally
interface SocialMediaProps {}
```

### **Features**

- ✅ Grid layout of Instagram profiles
- ✅ Loading states with InstagramSkeleton
- ✅ Responsive design (1-5 columns)
- ✅ External links to Instagram profiles
- ✅ Error handling for failed loads

### **Usage Example**

```tsx
import SocialMedia from '../components/SocialMedia';

function SocialMediaPage() {
  return (
    <main>
      <h1>Instagram das Gatas</h1>
      <SocialMedia />
    </main>
  );
}
```

---

## 🎨 Usage Examples

### **Complete Page Layout**

```tsx
import Head from 'next/head';
import Header from '../components/Header';
import NewsGrid from '../components/NewsGrid';
import BackToTopButton from '../components/BackToTopButton';
import ErrorBoundary from '../components/ErrorBoundary';

function HomePage() {
  return (
    <ErrorBoundary>
      <Head>
        <title>Gatas News - Portal de Notícias</title>
        <meta name="description" content="..." />
      </Head>

      <Header />

      <main>
        <NewsGrid />
      </main>

      <BackToTopButton />
    </ErrorBoundary>
  );
}

export default HomePage;
```

### **Error Handling Pattern**

```tsx
// Wrap components that might fail
<ErrorBoundary
  onError={error => {
    console.error('NewsGrid error:', error);
    // Send to analytics/error tracking
  }}
  resetKeys={[apiUrl, userId]}
>
  <NewsGrid />
</ErrorBoundary>;

// Handle loading and error states
function MyComponent() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  if (loading) return <ArticleSkeleton />;
  if (error) return <ErrorMessage error={error} onRetry={fetchData} />;
  if (!data) return <EmptyState />;

  return <DataDisplay data={data} />;
}
```

### **Responsive Layout Pattern**

```tsx
// Mobile-first responsive design
<div className="container mx-auto px-4">
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
    {items.map(item => (
      <div key={item.id} className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-sm sm:text-base md:text-lg font-semibold">{item.title}</h3>
        <p className="text-xs sm:text-sm text-gray-600 mt-2">{item.description}</p>
      </div>
    ))}
  </div>
</div>
```

---

## 🧪 Testing Components

### **Testing Strategy**

```tsx
import { renderWithProviders, setupUser } from '../test/utils/testHelpers';
import { createMockArticles } from '../test/utils/mockData';

describe('NewsGrid', () => {
  it('renders articles after successful fetch', async () => {
    const mockArticles = createMockArticles(3);
    mockFetch.mockSuccess({ data: { articles: mockArticles } });

    renderWithProviders(<NewsGrid />);

    await waitFor(() => {
      expect(screen.getByText(mockArticles[0].title)).toBeInTheDocument();
    });
  });

  it('handles search functionality', async () => {
    const user = setupUser();
    mockFetch.mockSuccess({ data: { articles: [] } });

    renderWithProviders(<NewsGrid />);

    await performSearch('Anitta');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('celebrity=Anitta'),
      expect.any(Object)
    );
  });
});
```

### **Component Test Checklist**

- [ ] **Rendering**: Component renders without crashing
- [ ] **Props**: All props are handled correctly
- [ ] **User Interactions**: Click, type, keyboard navigation work
- [ ] **Loading States**: Loading indicators appear/disappear
- [ ] **Error States**: Error messages display correctly
- [ ] **Accessibility**: ARIA labels, keyboard navigation
- [ ] **Responsive**: Layout works on different screen sizes
- [ ] **Performance**: No unnecessary re-renders

### **Mock Data Usage**

```tsx
import {
  createMockArticle,
  createMockArticles,
  createMockApiResponse,
  testScenarios,
} from '../test/utils/mockData';

// Single article
const article = createMockArticle({ title: 'Custom Title' });

// Multiple articles
const articles = createMockArticles(5, { source: { name: 'Test Source' } });

// API response
const response = createMockApiResponse(articles);

// Pre-defined scenarios
mockFetch.mockSuccess(testScenarios.withArticles);
mockFetch.mockSuccess(testScenarios.noArticles);
mockFetch.mockSuccess(testScenarios.searchResults('Anitta'));
```

---

## 🔧 Component Development Guidelines

### **Creating New Components**

1. **Start with TypeScript interface** for props
2. **Add JSDoc comments** with examples
3. **Implement accessibility** (ARIA labels, keyboard support)
4. **Handle loading and error states**
5. **Write tests** for main functionality
6. **Add to this documentation**

### **Component Checklist**

- [ ] TypeScript interfaces defined
- [ ] JSDoc comments added
- [ ] Error boundaries implemented
- [ ] Loading states handled
- [ ] Accessibility features added
- [ ] Responsive design tested
- [ ] Tests written and passing
- [ ] Documentation updated

### **Performance Best Practices**

- Use `memo()` for components that re-render frequently
- Use `useCallback()` for event handlers passed as props
- Use `useMemo()` for expensive calculations
- Implement proper cleanup in `useEffect()`
- Avoid creating objects/functions in render

---

**For more detailed implementation examples, see the component source files and their corresponding test files.** 📚
