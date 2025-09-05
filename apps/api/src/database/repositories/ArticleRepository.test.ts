import { ArticleRepository } from './ArticleRepository';
import { IArticle } from '../models/Article';

describe('ArticleRepository', () => {
  let articleRepository: ArticleRepository;

  beforeEach(() => {
    articleRepository = ArticleRepository.getInstance();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = ArticleRepository.getInstance();
      const instance2 = ArticleRepository.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(ArticleRepository);
    });
  });

  describe('buildFilterQuery', () => {
    it('should have required methods', () => {
      expect(typeof articleRepository.create).toBe('function');
      expect(typeof articleRepository.findById).toBe('function');
      expect(typeof articleRepository.findByUrl).toBe('function');
      expect(typeof articleRepository.findWithFilters).toBe('function');
      expect(typeof articleRepository.search).toBe('function');
      expect(typeof articleRepository.existsByUrl).toBe('function');
    });

    it('should have statistics methods', () => {
      expect(typeof articleRepository.getStatistics).toBe('function');
      expect(typeof articleRepository.getCount).toBe('function');
      expect(typeof articleRepository.getRecent).toBe('function');
      expect(typeof articleRepository.getPopular).toBe('function');
    });

    it('should have CRUD methods', () => {
      expect(typeof articleRepository.update).toBe('function');
      expect(typeof articleRepository.delete).toBe('function');
      expect(typeof articleRepository.softDelete).toBe('function');
      expect(typeof articleRepository.createMany).toBe('function');
    });
  });
});
