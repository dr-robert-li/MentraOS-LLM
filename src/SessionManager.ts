export interface SessionData {
  sessionId: string;
  userId: string;
  locationContext?: any;
  conversationHistory: any[];
  lastActivity: number;
}

/**
 * Node.js-compatible session manager using in-memory storage
 * Can be extended to use Redis, PostgreSQL, or other persistent storage
 */
export class MentraOSSessionManager {
  private sessions: Map<string, SessionData> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up old sessions every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000); // 1 hour
  }

  /**
   * Get session data
   */
  async getSession(sessionId: string, userId: string): Promise<SessionData> {
    let sessionData = this.sessions.get(sessionId);
    
    if (!sessionData) {
      // Create new session
      sessionData = {
        sessionId,
        userId,
        conversationHistory: [],
        lastActivity: Date.now()
      };
      this.sessions.set(sessionId, sessionData);
    }

    // Update last activity
    sessionData.lastActivity = Date.now();
    return sessionData;
  }

  /**
   * Update session data
   */
  async updateSession(sessionId: string, userId: string, updates: Partial<SessionData>): Promise<void> {
    let sessionData = this.sessions.get(sessionId) || {
      sessionId,
      userId,
      conversationHistory: [],
      lastActivity: Date.now()
    };

    // Apply updates
    sessionData = {
      ...sessionData,
      ...updates,
      lastActivity: Date.now()
    };

    this.sessions.set(sessionId, sessionData);
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string): Promise<SessionData[]> {
    const userSessions: SessionData[] = [];
    for (const sessionData of this.sessions.values()) {
      if (sessionData.userId === userId) {
        userSessions.push(sessionData);
      }
    }
    return userSessions;
  }

  /**
   * Clean up old sessions
   */
  private cleanup(): void {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    for (const [sessionId, sessionData] of this.sessions.entries()) {
      if (now - sessionData.lastActivity > oneHour) {
        this.sessions.delete(sessionId);
      }
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Global session manager instance
export const sessionManager = new MentraOSSessionManager();
