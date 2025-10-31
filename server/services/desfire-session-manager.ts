/**
 * DESFire Authentication Session Manager
 * 
 * Manages in-progress multi-step authentication sessions.
 * Each session tracks the state of an ongoing authentication between
 * a Pi machine and a DESFire card.
 */

export interface AuthSession {
  sessionId: string;
  cardId: string; // RFID card UID
  machineId?: number; // Optional machine ID
  rndA: Buffer; // Host-generated random number
  rndB: Buffer; // Card-generated random number (decrypted)
  aesKey: Buffer; // AES key for this card
  keyNumber: number; // Key number used for authentication
  timestamp: Date;
  step: 'started' | 'challenge_sent' | 'verified' | 'failed';
}

class DesfireSessionManager {
  private sessions: Map<string, AuthSession> = new Map();
  private readonly SESSION_TIMEOUT_MS = 30000; // 30 seconds
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupTimer();
  }

  /**
   * Create a new authentication session
   */
  createSession(
    sessionId: string,
    cardId: string,
    aesKey: Buffer,
    keyNumber: number = 0,
    machineId?: number
  ): AuthSession {
    const session: AuthSession = {
      sessionId,
      cardId,
      machineId,
      rndA: Buffer.alloc(16), // Will be set later
      rndB: Buffer.alloc(16), // Will be set later
      aesKey,
      keyNumber,
      timestamp: new Date(),
      step: 'started',
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Get an existing session
   */
  getSession(sessionId: string): AuthSession | undefined {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return undefined;
    }

    // Check if session has expired
    const age = Date.now() - session.timestamp.getTime();
    if (age > this.SESSION_TIMEOUT_MS) {
      this.deleteSession(sessionId);
      return undefined;
    }

    return session;
  }

  /**
   * Update session data
   */
  updateSession(sessionId: string, updates: Partial<AuthSession>): boolean {
    const session = this.getSession(sessionId);
    if (!session) {
      return false;
    }

    Object.assign(session, updates);
    session.timestamp = new Date(); // Update timestamp
    this.sessions.set(sessionId, session);
    return true;
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * Get all sessions for a card (useful for debugging)
   */
  getSessionsByCard(cardId: string): AuthSession[] {
    return Array.from(this.sessions.values()).filter(s => s.cardId === cardId);
  }

  /**
   * Clean up expired sessions
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      const age = now - session.timestamp.getTime();
      if (age > this.SESSION_TIMEOUT_MS) {
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      this.sessions.delete(sessionId);
    }

    if (expiredSessions.length > 0) {
      console.log(`[DESFire Session Manager] Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    // Run cleanup every 60 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  /**
   * Stop cleanup timer (for graceful shutdown)
   */
  stopCleanupTimer(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get session statistics (for monitoring)
   */
  getStats(): { total: number; byStep: Record<string, number> } {
    const stats = {
      total: this.sessions.size,
      byStep: {} as Record<string, number>,
    };

    for (const session of this.sessions.values()) {
      stats.byStep[session.step] = (stats.byStep[session.step] || 0) + 1;
    }

    return stats;
  }

  /**
   * Clear all sessions (for testing)
   */
  clearAll(): void {
    this.sessions.clear();
  }
}

// Singleton instance
export const sessionManager = new DesfireSessionManager();
