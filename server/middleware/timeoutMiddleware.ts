import { Request, Response, NextFunction } from 'express';
import { timeoutMonitor } from '../services/timeoutMonitor';

export interface TimeoutOptions {
  timeoutMs: number;
  routeName?: string;
}

/**
 * Route-specific timeout middleware
 * Terminates requests that exceed the specified timeout duration
 */
export function timeoutMiddleware(options: TimeoutOptions) {
  const { timeoutMs, routeName = 'Unknown route' } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    let timedOut = false;

    // Set timeout
    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      const duration = Date.now() - startTime;
      
      // Log to console
      console.error(`[TIMEOUT] ${routeName} exceeded ${timeoutMs}ms limit (${duration}ms)`, {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        timeout: timeoutMs,
        duration
      });

      // Log to timeout monitor
      timeoutMonitor.logTimeout({
        service: 'Route',
        operation: routeName,
        duration,
        timeout: timeoutMs,
        details: {
          method: req.method,
          url: req.originalUrl,
          ip: req.ip
        }
      });

      // Send timeout response if not already sent
      if (!res.headersSent) {
        res.status(504).json({
          success: false,
          error: 'Request timeout',
          message: `Operation timed out after ${timeoutMs}ms`,
          timeout: true
        });
      }
    }, timeoutMs);

    // Override res.end to clear timeout
    const originalEnd = res.end;
    res.end = function(...args: any[]) {
      clearTimeout(timeoutHandle);
      
      // Log successful completion within timeout
      if (!timedOut) {
        const duration = Date.now() - startTime;
        console.log(`[TIMEOUT_OK] ${routeName} completed in ${duration}ms (limit: ${timeoutMs}ms)`, {
          method: req.method,
          url: req.originalUrl,
          duration,
          timeout: timeoutMs
        });

        // Log to timeout monitor
        timeoutMonitor.logTimeout({
          service: 'Route',
          operation: routeName,
          duration,
          timeout: timeoutMs,
          details: {
            method: req.method,
            url: req.originalUrl
          }
        });
      }
      
      return originalEnd.apply(res, args as any);
    };

    next();
  };
}

/**
 * Predefined timeout configurations for different route types
 */
export const TIMEOUT_CONFIGS = {
  // Fast operations - RFID validation, machine authentication
  RFID: { timeoutMs: 5000, routeName: 'RFID Operation' },
  MACHINE_AUTH: { timeoutMs: 5000, routeName: 'Machine Authentication' },
  
  // Medium operations - Analytics, reports
  ANALYTICS: { timeoutMs: 60000, routeName: 'Analytics Report' },
  
  // Long operations - File exports
  EXPORT: { timeoutMs: 120000, routeName: 'File Export' },
  
  // API calls
  PAYMENT: { timeoutMs: 30000, routeName: 'Payment Processing' }
};
