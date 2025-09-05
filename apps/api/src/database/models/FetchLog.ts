import mongoose, { Schema, Document, Model } from 'mongoose';

// Interface for the FetchLog document
export interface IFetchLog extends Document {
  fetchDate: Date;
  articlesCount: number;
  celebrities: string[];
  status: 'success' | 'failed' | 'partial';
  error?: string;
  nextFetchDue: Date;
  duration: number; // in milliseconds
  apiCallsUsed: number;
  duplicatesFound: number;
  newArticlesAdded: number;
  metadata?: {
    totalApiCalls?: number;
    rateLimitRemaining?: number;
    rateLimitReset?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Interface for FetchLog model static methods
export interface IFetchLogModel extends Model<IFetchLog> {
  getLastSuccessfulFetch(): Promise<IFetchLog | null>;
  getRecentLogs(limit?: number): Promise<IFetchLog[]>;
  getFailedFetches(limit?: number): Promise<IFetchLog[]>;
  createFetchLog(data: Partial<IFetchLog>): Promise<IFetchLog>;
  getStatistics(): Promise<{
    totalFetches: number;
    successfulFetches: number;
    failedFetches: number;
    averageDuration: number;
    totalArticlesFetched: number;
  }>;
}

// FetchLog Schema
const FetchLogSchema = new Schema<IFetchLog>(
  {
    fetchDate: {
      type: Date,
      required: true,
      index: -1, // Descending index for recent fetches
    },
    articlesCount: {
      type: Number,
      required: true,
      min: 0,
    },
    celebrities: [
      {
        type: String,
        required: true,
      },
    ],
    status: {
      type: String,
      enum: ['success', 'failed', 'partial'],
      required: true,
      index: true,
    },
    error: {
      type: String,
      default: null,
    },
    nextFetchDue: {
      type: Date,
      required: true,
      index: 1, // For scheduling queries
    },
    duration: {
      type: Number,
      required: true,
      min: 0,
    },
    apiCallsUsed: {
      type: Number,
      required: true,
      min: 0,
    },
    duplicatesFound: {
      type: Number,
      default: 0,
      min: 0,
    },
    newArticlesAdded: {
      type: Number,
      default: 0,
      min: 0,
    },
    metadata: {
      totalApiCalls: {
        type: Number,
        default: null,
      },
      rateLimitRemaining: {
        type: Number,
        default: null,
      },
      rateLimitReset: {
        type: Date,
        default: null,
      },
    },
  },
  {
    timestamps: true,
    collection: 'fetchLogs',
  }
);

// Compound indexes
FetchLogSchema.index({ status: 1, fetchDate: -1 });
FetchLogSchema.index({ nextFetchDue: 1, status: 1 });

// Static methods
FetchLogSchema.statics.getLastSuccessfulFetch = function (): Promise<IFetchLog | null> {
  return this.findOne({ status: 'success' }).sort({ fetchDate: -1 }).exec();
};

FetchLogSchema.statics.getRecentLogs = function (limit: number = 10): Promise<IFetchLog[]> {
  return this.find({}).sort({ fetchDate: -1 }).limit(limit).exec();
};

FetchLogSchema.statics.getFailedFetches = function (limit: number = 10): Promise<IFetchLog[]> {
  return this.find({ status: 'failed' }).sort({ fetchDate: -1 }).limit(limit).exec();
};

FetchLogSchema.statics.createFetchLog = function (data: Partial<IFetchLog>): Promise<IFetchLog> {
  return this.create({
    fetchDate: new Date(),
    nextFetchDue: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    ...data,
  });
};

FetchLogSchema.statics.getStatistics = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalFetches: { $sum: 1 },
        successfulFetches: {
          $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] },
        },
        failedFetches: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
        },
        averageDuration: { $avg: '$duration' },
        totalArticlesFetched: { $sum: '$newArticlesAdded' },
      },
    },
  ]);

  return (
    stats[0] || {
      totalFetches: 0,
      successfulFetches: 0,
      failedFetches: 0,
      averageDuration: 0,
      totalArticlesFetched: 0,
    }
  );
};

// Instance methods
FetchLogSchema.methods.markAsCompleted = function (
  articlesCount: number,
  newArticlesAdded: number,
  duplicatesFound: number = 0
) {
  this.status = 'success';
  this.articlesCount = articlesCount;
  this.newArticlesAdded = newArticlesAdded;
  this.duplicatesFound = duplicatesFound;
  this.duration = Date.now() - this.fetchDate.getTime();
  return this.save();
};

FetchLogSchema.methods.markAsFailed = function (error: string) {
  this.status = 'failed';
  this.error = error;
  this.duration = Date.now() - this.fetchDate.getTime();
  return this.save();
};

// Create and export the model
export const FetchLog = mongoose.model<IFetchLog, IFetchLogModel>('FetchLog', FetchLogSchema);
