const express = require('express');
const router = express.Router();

const openaiService = require('../services/openaiService');
const conversationService = require('../services/conversationService');

// POST /api/chat - Send a message and get a response
router.post('/', async (req, res) => {
  try {
    const { message, sessionId, options = {} } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required and must be a string' });
    }

    // Get or create session
    let session;
    if (sessionId) {
      session = await conversationService.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
    } else {
      session = await conversationService.createSession();
    }

    // Add user message to conversation history
    await conversationService.addMessage(session.id, 'user', message);

    // Get conversation history for context
    const conversationHistory = await conversationService.getFormattedMessages(session.id);

    // Generate response from GPT-4
    const aiResponse = await openaiService.generateResponse(conversationHistory, options);

    // Add assistant response to conversation history
    await conversationService.addMessage(session.id, 'assistant', aiResponse.response, {
      usage: aiResponse.usage,
      model: aiResponse.model
    });

    res.json({
      sessionId: session.id,
      message: aiResponse.response,
      usage: aiResponse.usage,
      model: aiResponse.model,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      error: 'Failed to process chat message',
      message: error.message 
    });
  }
});

// POST /api/chat/stream - Send a message and get a streaming response
router.post('/stream', async (req, res) => {
  try {
    const { message, sessionId, options = {} } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required and must be a string' });
    }

    // Set headers for Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // Get or create session
    let session;
    if (sessionId) {
      session = await conversationService.getSession(sessionId);
      if (!session) {
        res.write(JSON.stringify({ error: 'Session not found' }));
        return res.end();
      }
    } else {
      session = await conversationService.createSession();
    }

    // Add user message to conversation history
    await conversationService.addMessage(session.id, 'user', message);

    // Get conversation history for context
    const conversationHistory = await conversationService.getFormattedMessages(session.id);

    // Generate streaming response from GPT-4
    const stream = await openaiService.generateStreamResponse(conversationHistory, options);

    let fullResponse = '';
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullResponse += content;
        res.write(JSON.stringify({
          sessionId: session.id,
          content: content,
          type: 'chunk'
        }) + '\n');
      }
    }

    // Add complete assistant response to conversation history
    await conversationService.addMessage(session.id, 'assistant', fullResponse);

    // Send completion signal
    res.write(JSON.stringify({
      sessionId: session.id,
      type: 'complete',
      fullResponse: fullResponse
    }) + '\n');

    res.end();

  } catch (error) {
    console.error('Stream chat error:', error);
    res.write(JSON.stringify({ 
      error: 'Failed to process streaming chat message',
      message: error.message 
    }));
    res.end();
  }
});

// GET /api/chat/session/:sessionId - Get session information
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await conversationService.getSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(session);
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve session',
      message: error.message 
    });
  }
});

// GET /api/chat/history/:sessionId - Get conversation history
router.get('/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = 50 } = req.query;

    const history = await conversationService.getConversationHistory(sessionId, parseInt(limit));

    if (history.length === 0) {
      return res.status(404).json({ error: 'Session not found or no history available' });
    }

    res.json({
      sessionId,
      messages: history,
      count: history.length
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve conversation history',
      message: error.message 
    });
  }
});

// POST /api/chat/session - Create a new session
router.post('/session', async (req, res) => {
  try {
    const { sessionId } = req.body;
    const session = await conversationService.createSession(sessionId);

    res.json({
      sessionId: session.id,
      createdAt: session.createdAt,
      message: 'Session created successfully'
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ 
      error: 'Failed to create session',
      message: error.message 
    });
  }
});

// DELETE /api/chat/session/:sessionId - Delete a session
router.delete('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const deleted = await conversationService.deleteSession(sessionId);

    if (!deleted) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ 
      error: 'Failed to delete session',
      message: error.message 
    });
  }
});

// GET /api/chat/sessions - Get all sessions
router.get('/sessions', async (req, res) => {
  try {
    const sessions = await conversationService.getAllSessions();
    res.json({ sessions, count: sessions.length });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve sessions',
      message: error.message 
    });
  }
});

// GET /api/chat/stats/:sessionId - Get session statistics
router.get('/stats/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const stats = await conversationService.getSessionStats(sessionId);

    if (!stats) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve session statistics',
      message: error.message 
    });
  }
});

// POST /api/chat/cleanup - Clean up old sessions
router.post('/cleanup', async (req, res) => {
  try {
    const { maxAge } = req.body;
    const cleanedCount = await conversationService.cleanupOldSessions(maxAge);

    res.json({ 
      message: 'Cleanup completed',
      cleanedSessions: cleanedCount 
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ 
      error: 'Failed to cleanup sessions',
      message: error.message 
    });
  }
});

module.exports = router;