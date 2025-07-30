const redisClient = require('../config/redis');
const { v4: uuidv4 } = require('uuid');

class ConversationService {
  constructor() {
    this.keyPrefix = 'chat:session:';
    this.defaultTTL = 24 * 60 * 60; // 24 hours in seconds
  }

  generateSessionId() {
    return uuidv4();
  }

  getSessionKey(sessionId) {
    return `${this.keyPrefix}${sessionId}`;
  }

  async createSession(sessionId = null) {
    const id = sessionId || this.generateSessionId();
    const sessionKey = this.getSessionKey(id);
    
    const session = {
      id,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      messages: []
    };

    await redisClient.setEx(sessionKey, this.defaultTTL, JSON.stringify(session));
    return session;
  }

  async getSession(sessionId) {
    const sessionKey = this.getSessionKey(sessionId);
    const sessionData = await redisClient.get(sessionKey);
    
    if (!sessionData) {
      return null;
    }

    return JSON.parse(sessionData);
  }

  async addMessage(sessionId, role, content, metadata = {}) {
    const session = await this.getSession(sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }

    const message = {
      id: uuidv4(),
      role,
      content,
      timestamp: new Date().toISOString(),
      ...metadata
    };

    session.messages.push(message);
    session.lastActivity = new Date().toISOString();

    await this.saveSession(session);
    return message;
  }

  async saveSession(session) {
    const sessionKey = this.getSessionKey(session.id);
    await redisClient.setEx(sessionKey, this.defaultTTL, JSON.stringify(session));
  }

  async getConversationHistory(sessionId, limit = 50) {
    const session = await this.getSession(sessionId);
    
    if (!session) {
      return [];
    }

    // Return messages in chronological order, limited by count
    return session.messages.slice(-limit);
  }

  async getFormattedMessages(sessionId, includeSystem = false) {
    const messages = await this.getConversationHistory(sessionId);
    
    return messages
      .filter(msg => includeSystem || msg.role !== 'system')
      .map(msg => ({
        role: msg.role,
        content: msg.content
      }));
  }

  async deleteSession(sessionId) {
    const sessionKey = this.getSessionKey(sessionId);
    const result = await redisClient.del(sessionKey);
    return result > 0;
  }

  async extendSession(sessionId) {
    const sessionKey = this.getSessionKey(sessionId);
    const exists = await redisClient.exists(sessionKey);
    
    if (exists) {
      await redisClient.expire(sessionKey, this.defaultTTL);
      return true;
    }
    
    return false;
  }

  async getAllSessions() {
    const keys = await redisClient.keys(`${this.keyPrefix}*`);
    const sessions = [];

    for (const key of keys) {
      const sessionData = await redisClient.get(key);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        sessions.push({
          id: session.id,
          createdAt: session.createdAt,
          lastActivity: session.lastActivity,
          messageCount: session.messages.length
        });
      }
    }

    return sessions.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
  }

  async cleanupOldSessions(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 days
    const keys = await redisClient.keys(`${this.keyPrefix}*`);
    let cleanedCount = 0;

    for (const key of keys) {
      const sessionData = await redisClient.get(key);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        const lastActivity = new Date(session.lastActivity);
        const now = new Date();
        
        if (now - lastActivity > maxAge) {
          await redisClient.del(key);
          cleanedCount++;
        }
      }
    }

    return cleanedCount;
  }

  async getSessionStats(sessionId) {
    const session = await this.getSession(sessionId);
    
    if (!session) {
      return null;
    }

    const userMessages = session.messages.filter(msg => msg.role === 'user').length;
    const assistantMessages = session.messages.filter(msg => msg.role === 'assistant').length;
    const totalMessages = session.messages.length;
    
    const firstMessage = session.messages[0];
    const lastMessage = session.messages[session.messages.length - 1];

    return {
      sessionId: session.id,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      totalMessages,
      userMessages,
      assistantMessages,
      firstMessageAt: firstMessage?.timestamp,
      lastMessageAt: lastMessage?.timestamp
    };
  }
}

module.exports = new ConversationService();