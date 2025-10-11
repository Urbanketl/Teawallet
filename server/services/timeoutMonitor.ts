/**
 * Timeout Monitoring Service
 * Tracks and logs timeout events across the application
 */

export interface TimeoutEvent {
  timestamp: Date;
  service: string;
  operation: string;
  duration: number;
  timeout: number;
  exceeded: boolean;
  details?: any;
}

class TimeoutMonitor {
  private events: TimeoutEvent[] = [];
  private readonly MAX_EVENTS = 1000; // Keep last 1000 events in memory

  /**
   * Log a timeout event
   */
  logTimeout(event: Omit<TimeoutEvent, 'timestamp' | 'exceeded'>) {
    const fullEvent: TimeoutEvent = {
      ...event,
      timestamp: new Date(),
      exceeded: event.duration > event.timeout
    };

    this.events.push(fullEvent);

    // Keep only recent events
    if (this.events.length > this.MAX_EVENTS) {
      this.events.shift();
    }

    // Log to console
    if (fullEvent.exceeded) {
      console.error(`[TIMEOUT_EXCEEDED] ${event.service} - ${event.operation}`, {
        duration: `${event.duration}ms`,
        timeout: `${event.timeout}ms`,
        exceeded_by: `${event.duration - event.timeout}ms`,
        details: event.details
      });
    } else {
      console.log(`[TIMEOUT_OK] ${event.service} - ${event.operation}`, {
        duration: `${event.duration}ms`,
        timeout: `${event.timeout}ms`,
        margin: `${event.timeout - event.duration}ms`
      });
    }
  }

  /**
   * Get timeout statistics
   */
  getStats() {
    const totalEvents = this.events.length;
    const timeoutExceeded = this.events.filter(e => e.exceeded).length;
    const timeoutOk = totalEvents - timeoutExceeded;

    const byService = this.events.reduce((acc, event) => {
      if (!acc[event.service]) {
        acc[event.service] = { total: 0, exceeded: 0, ok: 0 };
      }
      acc[event.service].total++;
      if (event.exceeded) {
        acc[event.service].exceeded++;
      } else {
        acc[event.service].ok++;
      }
      return acc;
    }, {} as Record<string, { total: number; exceeded: number; ok: number }>);

    return {
      total: totalEvents,
      exceeded: timeoutExceeded,
      ok: timeoutOk,
      successRate: totalEvents > 0 ? ((timeoutOk / totalEvents) * 100).toFixed(2) + '%' : 'N/A',
      byService
    };
  }

  /**
   * Get recent timeout events
   */
  getRecentEvents(limit: number = 50): TimeoutEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Get events that exceeded timeout
   */
  getExceededEvents(limit: number = 50): TimeoutEvent[] {
    return this.events.filter(e => e.exceeded).slice(-limit);
  }

  /**
   * Clear all events (for testing)
   */
  clear() {
    this.events = [];
  }
}

export const timeoutMonitor = new TimeoutMonitor();
