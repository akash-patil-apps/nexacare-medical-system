// server/utils/db-retry.ts
// Utility for retrying database operations with exponential backoff

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  retryableErrors?: string[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 100, // 100ms
  maxDelay: 2000, // 2 seconds
  retryableErrors: ['ENETDOWN', 'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND'],
};

/**
 * Retry a database operation with exponential backoff
 */
export async function retryDbOperation<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check if error is retryable
      const errorCode = error?.code || error?.cause?.code || '';
      const errorMessage = error?.message || '';
      const isRetryable = opts.retryableErrors.some(
        code => errorCode.includes(code) || errorMessage.includes(code)
      );

      // Don't retry if it's the last attempt or error is not retryable
      if (attempt === opts.maxRetries || !isRetryable) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.initialDelay * Math.pow(2, attempt),
        opts.maxDelay
      );

      console.warn(
        `⚠️ Database operation failed (attempt ${attempt + 1}/${opts.maxRetries + 1}), retrying in ${delay}ms...`,
        { errorCode, errorMessage: errorMessage.substring(0, 100) }
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error('Database operation failed after retries');
}


