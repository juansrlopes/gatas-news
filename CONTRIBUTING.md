# 🤝 Contributing to Gatas News

Thank you for your interest in contributing to Gatas News! This guide will help you get started with contributing to the project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style Guidelines](#code-style-guidelines)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)

## 🤝 Code of Conduct

This project follows a simple code of conduct:

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Keep discussions professional and on-topic

## 🚀 Getting Started

### Prerequisites

Before contributing, make sure you have:

- Node.js 18+ installed
- MongoDB and Redis running locally
- A NewsAPI.org account (free tier is fine)
- Git configured with your name and email

### Setup for Contributors

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/gatas-news.git
   cd gatas-news
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/gatas-news.git
   ```
4. **Run setup script**:
   ```bash
   npm run setup
   ```
5. **Create your environment file**:
   ```bash
   cp apps/api/.env.example apps/api/.env
   # Edit apps/api/.env with your NewsAPI key
   ```

## 🔄 Development Workflow

### Branch Strategy

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/feature-name` - Individual features
- `bugfix/bug-name` - Bug fixes
- `hotfix/critical-fix` - Critical production fixes

### Working on a Feature

1. **Create a feature branch**:

   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Keep your branch updated**:

   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

3. **Make your changes** following our guidelines

4. **Test your changes**:

   ```bash
   npm run test
   npm run lint          # Must pass with zero errors/warnings
   npm run format
   ```

   **🚨 CRITICAL**: All code must pass linting with **zero errors and zero warnings**. The Git hooks will enforce this automatically.

5. **Commit with meaningful messages**:

   ```bash
   git add .
   git commit -m "feat: add amazing new feature

   - Implement feature X
   - Add tests for feature X
   - Update documentation"
   ```

6. **Push and create PR**:
   ```bash
   git push origin feature/amazing-feature
   ```

### Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**

```bash
feat(api): add celebrity search endpoint
fix(frontend): resolve article loading issue
docs: update API documentation
test(api): add tests for news service
```

## 📝 Code Style Guidelines

### TypeScript/JavaScript

- **Use TypeScript** for all new code
- **Prefer interfaces** over types for object shapes
- **Use meaningful names** for variables and functions
- **Add JSDoc comments** for public methods
- **Avoid `any` type** - use proper typing

```typescript
// ✅ Good
interface ArticleFilters {
  celebrity?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  dateFrom?: Date;
}

/**
 * Fetches articles with the specified filters
 * @param filters - Filtering criteria
 * @returns Promise with filtered articles
 */
async function getArticles(filters: ArticleFilters): Promise<Article[]> {
  // Implementation
}

// ❌ Bad
function getStuff(data: any): any {
  // Implementation
}
```

### File Organization

- **Group related functionality** in the same directory
- **Use index files** to export public APIs
- **Keep files focused** - one main responsibility per file
- **Use descriptive file names**

```
src/
├── controllers/     # HTTP request handlers
├── services/        # Business logic
├── database/        # Data layer
│   ├── models/      # Database schemas
│   └── repositories/ # Data access
├── utils/           # Utility functions
└── types/           # Type definitions
```

### Error Handling

- **Use specific error types** instead of generic Error
- **Provide meaningful error messages**
- **Log errors with context**
- **Handle errors at appropriate levels**
- **Use type guards instead of `any`** for error handling
- **Prefix unused parameters with `_`** to satisfy linting

```typescript
// ✅ Good
class ValidationError extends Error {
  constructor(
    message: string,
    public field: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

if (!celebrity) {
  throw new ValidationError('Celebrity name is required', 'celebrity');
}

// ❌ Bad
if (!celebrity) {
  throw new Error('Bad input');
}
```

## 🧪 Testing Guidelines

### Test Structure

- **Write tests for new features**
- **Update tests when changing existing code**
- **Use descriptive test names**
- **Group related tests with `describe` blocks**

```typescript
describe('NewsService', () => {
  describe('getNews', () => {
    it('should return paginated articles', async () => {
      // Test implementation
    });

    it('should filter by celebrity name', async () => {
      // Test implementation
    });

    it('should throw error for invalid celebrity', async () => {
      // Test implementation
    });
  });
});
```

### Test Types

1. **Unit Tests** - Test individual functions/methods
2. **Integration Tests** - Test component interactions
3. **API Tests** - Test HTTP endpoints
4. **Database Tests** - Test data operations

### Running Tests

```bash
# All tests
npm run test

# Specific test file
npm run test:api -- --testNamePattern="NewsService"

# Watch mode during development
cd apps/api && npx jest --watch

# Coverage report
npm run test -- --coverage
```

## 🔍 Pull Request Process

### Before Submitting

- [ ] Code follows style guidelines
- [ ] Tests pass: `npm run test`
- [ ] **Linting passes with ZERO errors/warnings**: `npm run lint`
- [ ] Code is formatted: `npm run format`
- [ ] Documentation is updated if needed
- [ ] Commit messages follow convention
- [ ] **Git hooks are working** (automatic quality checks)

### 🔧 Git Hooks (Automatic Quality Control)

This project uses **Husky** and **lint-staged** for automatic quality control:

#### **Pre-commit Hook**
- Automatically runs linting on staged files
- **Blocks commits** if linting fails
- Ensures only clean code enters the repository

#### **Pre-push Hook**
- Runs full workspace lint before push
- **Blocks pushes** if any project has linting errors
- Final quality gate before code reaches remote

#### **Setup Git Hooks**

```bash
# Git hooks are automatically installed after npm install
# If hooks aren't working, reinstall them:
npm run prepare

# Test the hooks:
git add .
git commit -m "test commit"  # Should run pre-commit linting
```

### PR Template

When creating a PR, please include:

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Screenshots (if applicable)

Add screenshots for UI changes

## Checklist

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Tests pass
- [ ] Documentation updated
```

### Review Process

1. **Automated checks** must pass (tests, linting)
2. **Code review** by at least one maintainer
3. **Manual testing** if needed
4. **Approval** and merge by maintainer

## 🐛 Issue Reporting

### Bug Reports

When reporting bugs, please include:

```markdown
**Bug Description**
Clear description of the bug

**Steps to Reproduce**

1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What should happen

**Actual Behavior**
What actually happens

**Environment**

- OS: [e.g., macOS 12.0]
- Node.js: [e.g., 18.15.0]
- Browser: [e.g., Chrome 91]

**Additional Context**
Screenshots, logs, etc.
```

### Feature Requests

For feature requests, please include:

```markdown
**Feature Description**
Clear description of the feature

**Use Case**
Why is this feature needed?

**Proposed Solution**
How should this work?

**Alternatives Considered**
Other approaches you've thought about

**Additional Context**
Mockups, examples, etc.
```

## 🏗️ Architecture Guidelines

### Adding New Features

When adding new features:

1. **Follow existing patterns** in the codebase
2. **Add appropriate tests** for your feature
3. **Update documentation** as needed
4. **Consider performance impact**
5. **Think about error scenarios**

### Database Changes

For database changes:

1. **Create migration scripts** if needed
2. **Update model interfaces**
3. **Add appropriate indexes**
4. **Test with realistic data volumes**
5. **Consider backward compatibility**

### API Changes

For API changes:

1. **Follow REST conventions**
2. **Maintain backward compatibility** when possible
3. **Update API documentation**
4. **Add appropriate validation**
5. **Consider rate limiting impact**

## 📚 Resources

### Learning Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Express.js Guide](https://expressjs.com/en/guide/)
- [MongoDB Manual](https://docs.mongodb.com/manual/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)

### Project-Specific Resources

- [API Documentation](apps/api/README.md)
- [Developer Guide](DEVELOPER_GUIDE.md)
- [Architecture Overview](README.md#architecture)

## 🆘 Getting Help

If you need help:

1. **Check existing documentation** first
2. **Search existing issues** on GitHub
3. **Ask in discussions** for general questions
4. **Create an issue** for bugs or feature requests
5. **Reach out to maintainers** for urgent matters

## 🙏 Recognition

Contributors will be recognized in:

- README.md contributors section
- Release notes for significant contributions
- Special thanks for first-time contributors

Thank you for contributing to Gatas News! 🎉
