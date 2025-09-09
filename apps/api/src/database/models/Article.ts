import mongoose, { Schema, Document, Model } from 'mongoose';

// Interface for the Article document
export interface IArticle extends Document {
  url: string;
  title: string;
  description: string;
  content?: string;
  urlToImage?: string;
  publishedAt: Date;
  source: {
    id: string | null;
    name: string;
  };
  author?: string;
  celebrity: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  tags?: string[];
  readingTime?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Interface for Article model static methods
export interface IArticleModel extends Model<IArticle> {
  findByCelebrity(_celebrity: string, _limit?: number, _page?: number): Promise<IArticle[]>;
  findRecent(_limit?: number): Promise<IArticle[]>;
  findByDateRange(_startDate: Date, _endDate: Date): Promise<IArticle[]>;
  markAsInactive(_articleId: string): Promise<IArticle | null>;
  getPopularArticles(_limit?: number): Promise<IArticle[]>;
}

// Article Schema
const ArticleSchema = new Schema<IArticle>(
  {
    url: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      index: 'text', // For text search
    },
    description: {
      type: String,
      required: true,
      index: 'text', // For text search
    },
    content: {
      type: String,
      default: null,
    },
    urlToImage: {
      type: String,
      default: null,
    },
    publishedAt: {
      type: Date,
      required: true,
      index: -1, // Descending index for recent articles
    },
    source: {
      id: {
        type: String,
        default: null,
      },
      name: {
        type: String,
        required: true,
        index: true,
      },
    },
    author: {
      type: String,
      default: null,
    },
    celebrity: {
      type: String,
      required: true,
      index: true, // For filtering by celebrity
    },
    sentiment: {
      type: String,
      enum: ['positive', 'negative', 'neutral'],
      default: 'neutral',
      index: true,
    },
    tags: [
      {
        type: String,
        index: true,
      },
    ],
    readingTime: {
      type: Number,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
    collection: 'articles',
  }
);

// Compound indexes for better query performance
ArticleSchema.index({ celebrity: 1, publishedAt: -1 });
ArticleSchema.index({ isActive: 1, publishedAt: -1 });
ArticleSchema.index({ sentiment: 1, publishedAt: -1 });
ArticleSchema.index({ 'source.name': 1, publishedAt: -1 });

// Text index for full-text search
ArticleSchema.index({
  title: 'text',
  description: 'text',
  content: 'text',
});

// Static methods
ArticleSchema.statics.findByCelebrity = function (
  celebrity: string,
  limit: number = 20,
  page: number = 1
): Promise<IArticle[]> {
  const skip = (page - 1) * limit;
  return this.find({
    celebrity: { $regex: celebrity, $options: 'i' },
    isActive: true,
  })
    .sort({ publishedAt: -1 })
    .skip(skip)
    .limit(limit)
    .exec();
};

ArticleSchema.statics.findRecent = function (limit: number = 20): Promise<IArticle[]> {
  return this.find({ isActive: true }).sort({ publishedAt: -1 }).limit(limit).exec();
};

ArticleSchema.statics.findByDateRange = function (
  startDate: Date,
  endDate: Date
): Promise<IArticle[]> {
  return this.find({
    publishedAt: { $gte: startDate, $lte: endDate },
    isActive: true,
  })
    .sort({ publishedAt: -1 })
    .exec();
};

ArticleSchema.statics.markAsInactive = function (articleId: string): Promise<IArticle | null> {
  return this.findByIdAndUpdate(articleId, { isActive: false }, { new: true }).exec();
};

ArticleSchema.statics.getPopularArticles = function (limit: number = 10): Promise<IArticle[]> {
  // This is a simplified popularity algorithm
  // In a real app, you'd track views, clicks, shares, etc.
  return this.find({ isActive: true }).sort({ publishedAt: -1 }).limit(limit).exec();
};

// Instance methods
ArticleSchema.methods.calculateReadingTime = function (): number {
  const wordsPerMinute = 200;
  const wordCount = (this.content || this.description || '').split(' ').length;
  return Math.ceil(wordCount / wordsPerMinute);
};

// Pre-save middleware
ArticleSchema.pre('save', function (next) {
  // Calculate reading time if not provided
  if (!this.readingTime) {
    const wordsPerMinute = 200;
    const wordCount = (this.content || this.description || '').split(' ').length;
    this.readingTime = Math.ceil(wordCount / wordsPerMinute);
  }
  next();
});

// Create and export the model
export const Article = mongoose.model<IArticle, IArticleModel>('Article', ArticleSchema);
