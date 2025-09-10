import mongoose, { Schema, Document, Model } from 'mongoose';

// Interface for the Celebrity document
export interface ICelebrity extends Document {
  name: string;
  slug: string; // URL-friendly version of name
  aliases: string[]; // Alternative names, nicknames
  isActive: boolean;

  // Analytics (auto-calculated)
  totalArticles: number;
  lastFetchedAt?: Date;
  avgArticlesPerDay: number;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// Interface for Celebrity model static methods
export interface ICelebrityModel extends Model<ICelebrity> {
  findActive(_limit?: number): Promise<ICelebrity[]>;
  searchByName(_query: string): Promise<ICelebrity[]>;
  updateArticleStats(_celebrityId: string, _articleCount: number): Promise<ICelebrity | null>;
}

// Celebrity Schema
const CelebritySchema = new Schema<ICelebrity>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    aliases: [
      {
        type: String,
        trim: true,
        index: true,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    totalArticles: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastFetchedAt: {
      type: Date,
      index: -1,
    },
    avgArticlesPerDay: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    collection: 'celebrities',
  }
);

// Compound indexes for better query performance
CelebritySchema.index({ isActive: 1, totalArticles: -1 });
CelebritySchema.index({ isActive: 1, lastFetchedAt: -1 }); // For fetching optimization

// Text index for search
CelebritySchema.index({
  name: 'text',
  aliases: 'text',
});

// Pre-save middleware to generate slug
CelebritySchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens
      .trim();
  }

  next();
});

// Static methods
CelebritySchema.statics.findActive = function (limit: number = 100): Promise<ICelebrity[]> {
  return this.find({ isActive: true }).sort({ totalArticles: -1, name: 1 }).limit(limit).exec();
};

CelebritySchema.statics.searchByName = function (query: string): Promise<ICelebrity[]> {
  const searchRegex = new RegExp(query, 'i');
  return this.find({
    isActive: true,
    $or: [{ name: searchRegex }, { aliases: { $in: [searchRegex] } }],
  })
    .sort({ totalArticles: -1, name: 1 })
    .exec();
};

CelebritySchema.statics.updateArticleStats = function (
  celebrityId: string,
  articleCount: number
): Promise<ICelebrity | null> {
  const now = new Date();
  return this.findByIdAndUpdate(
    celebrityId,
    {
      $inc: { totalArticles: articleCount },
      lastFetchedAt: now,
      // Calculate average (simplified - in production you'd want more sophisticated calculation)
      $set: {
        avgArticlesPerDay: articleCount, // This would be calculated based on historical data
      },
    },
    { new: true }
  ).exec();
};

// Instance methods
CelebritySchema.methods.getAllSearchTerms = function (): string[] {
  return [this.name, ...this.aliases].filter(Boolean);
};

CelebritySchema.methods.updatePerformanceMetrics = function (newArticleCount: number) {
  this.totalArticles += newArticleCount;
  this.lastFetchedAt = new Date();

  // Simple average calculation (in production, you'd want rolling averages)
  const daysSinceCreation = Math.max(
    1,
    Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24))
  );
  this.avgArticlesPerDay = this.totalArticles / daysSinceCreation;

  return this.save();
};

// Create and export the model
export const Celebrity = mongoose.model<ICelebrity, ICelebrityModel>('Celebrity', CelebritySchema);
