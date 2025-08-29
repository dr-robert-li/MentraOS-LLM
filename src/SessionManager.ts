export interface SessionEnv {
  MENTRAOS_LLM: KVNamespace;
}

export interface SessionData {
  sessionId: string;
  userId: string;
  locationContext?: any;
  conversationHistory: any[];
  lastActivity: number;
}

// Define SQLite cursor interface for results
interface SqlCursor {
  [Symbol.iterator](): Iterator<any>;
  next(): IteratorResult<any>;
  toArray(): any[];
  one(): any;
  rowsRead: number;
}

// Define SQLite storage interface
interface SqlStorage {
  exec(query: string, ...params: any[]): SqlCursor;
}

// Define Durable Object State interface
interface DurableObjectState {
  id: DurableObjectId;
  storage: {
    sql: SqlStorage;
    get<T = any>(key: string): Promise<T | undefined>;
    put<T>(key: string, value: T): Promise<void>;
    delete(key: string): Promise<boolean>;
    setAlarm(scheduledTime: number): Promise<void>;
    deleteAlarm(): Promise<void>;
    deleteAll(): Promise<void>;
  };
  blockConcurrencyWhile(promise: Promise<any> | (() => Promise<any>)): void;
  waitUntil(promise: Promise<any>): void;
}

interface DurableObjectId {
  toString(): string;
}

export class MentraOSSessionManager {
  private sessions: Map<string, SessionData> = new Map();
  private env: SessionEnv;
  private ctx: DurableObjectState;

  constructor(ctx: DurableObjectState, env: SessionEnv) {
    this.ctx = ctx;
    this.env = env;
    
    // Initialize from SQLite storage on first access
    ctx.blockConcurrencyWhile(async () => {
      // Create sessions table if it doesn't exist (SQLite backend - FREE storage!)
      await ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
          sessionId TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          locationContext TEXT,
          conversationHistory TEXT,
          lastActivity INTEGER NOT NULL
        )
      `);
      
      // Load active sessions into memory for faster access
      const results = await ctx.storage.sql.exec(`
        SELECT sessionId, userId, locationContext, conversationHistory, lastActivity 
        FROM sessions 
        WHERE lastActivity > ? 
        ORDER BY lastActivity DESC 
        LIMIT 100
      `, Date.now() - 3600000); // Only load sessions from last hour
      
      for (const row of results) {
        const sessionData: SessionData = {
          sessionId: row.sessionId as string,
          userId: row.userId as string,
          locationContext: row.locationContext ? JSON.parse(row.locationContext as string) : undefined,
          conversationHistory: row.conversationHistory ? JSON.parse(row.conversationHistory as string) : [],
          lastActivity: row.lastActivity as number
        };
        this.sessions.set(sessionData.sessionId, sessionData);
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId");
    const userId = url.searchParams.get("userId");

    if (!sessionId || !userId) {
      return new Response("Missing sessionId or userId", { status: 400 });
    }

    const method = request.method;

    switch (method) {
      case "GET":
        return this.getSession(sessionId, userId);
      case "POST":
        return this.updateSession(sessionId, userId, request);
      case "DELETE":
        return this.deleteSession(sessionId);
      default:
        return new Response("Method not allowed", { status: 405 });
    }
  }

  private async getSession(sessionId: string, userId: string): Promise<Response> {
    // Try memory first for fast access
    let sessionData = this.sessions.get(sessionId);
    
    if (!sessionData) {
      // Load from SQLite storage (FREE!)
      const results = await this.ctx.storage.sql.exec(
        `SELECT sessionId, userId, locationContext, conversationHistory, lastActivity 
         FROM sessions WHERE sessionId = ?`,
        sessionId
      );
      
      const row = results.toArray()[0];
      if (row) {
        sessionData = {
          sessionId: row.sessionId as string,
          userId: row.userId as string,
          locationContext: row.locationContext ? JSON.parse(row.locationContext as string) : undefined,
          conversationHistory: row.conversationHistory ? JSON.parse(row.conversationHistory as string) : [],
          lastActivity: row.lastActivity as number
        };
        this.sessions.set(sessionId, sessionData);
      } else {
        // Create new session
        sessionData = {
          sessionId,
          userId,
          conversationHistory: [],
          lastActivity: Date.now()
        };
        this.sessions.set(sessionId, sessionData);
        
        // Persist new session to SQLite
        await this.ctx.storage.sql.exec(
          `INSERT OR REPLACE INTO sessions (sessionId, userId, locationContext, conversationHistory, lastActivity)
           VALUES (?, ?, ?, ?, ?)`,
          sessionId,
          userId,
          null,
          JSON.stringify([]),
          Date.now()
        );
      }
    }

    return Response.json(sessionData);
  }

  private async updateSession(sessionId: string, userId: string, request: Request): Promise<Response> {
    const updates = await request.json() as Partial<SessionData>;
    
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

    // Update memory for fast access
    this.sessions.set(sessionId, sessionData);

    // Persist to SQLite storage (FREE!)
    await this.ctx.storage.sql.exec(
      `INSERT OR REPLACE INTO sessions (sessionId, userId, locationContext, conversationHistory, lastActivity)
       VALUES (?, ?, ?, ?, ?)`,
      sessionData.sessionId,
      sessionData.userId,
      sessionData.locationContext ? JSON.stringify(sessionData.locationContext) : null,
      JSON.stringify(sessionData.conversationHistory),
      sessionData.lastActivity
    );

    return Response.json({ success: true });
  }

  private async deleteSession(sessionId: string): Promise<Response> {
    // Remove from memory
    this.sessions.delete(sessionId);

    // Remove from SQLite storage
    await this.ctx.storage.sql.exec(`DELETE FROM sessions WHERE sessionId = ?`, sessionId);

    return Response.json({ success: true });
  }

  // Cleanup old sessions periodically
  async alarm(): Promise<void> {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    // Clean up memory sessions older than 1 hour
    for (const [sessionId, sessionData] of this.sessions.entries()) {
      if (now - sessionData.lastActivity > oneHour) {
        this.sessions.delete(sessionId);
      }
    }

    // Set next alarm for 1 hour
    await this.ctx.storage.setAlarm(now + oneHour);
  }
}
