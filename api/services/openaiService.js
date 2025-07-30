const OpenAI = require('openai');

class OpenAIService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    this.defaultModel = 'gpt-4';
    this.maxTokens = 1000;
    this.temperature = 0.7;
  }

  async generateResponse(messages, options = {}) {
    try {
      const {
        model = this.defaultModel,
        maxTokens = this.maxTokens,
        temperature = this.temperature,
        systemPrompt = "You are a helpful AI assistant."
      } = options;

      // Prepare messages with system prompt
      const formattedMessages = [
        { role: 'system', content: systemPrompt },
        ...messages
      ];

      const completion = await this.openai.chat.completions.create({
        model,
        messages: formattedMessages,
        max_tokens: maxTokens,
        temperature,
        stream: false,
      });

      return {
        success: true,
        response: completion.choices[0].message.content,
        usage: completion.usage,
        model: completion.model
      };
    } catch (error) {
      console.error('OpenAI API error:', error);
      
      if (error.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (error.status === 401) {
        throw new Error('Invalid OpenAI API key.');
      } else if (error.status === 400) {
        throw new Error('Invalid request to OpenAI API.');
      } else {
        throw new Error('Failed to generate response from OpenAI.');
      }
    }
  }

  async generateStreamResponse(messages, options = {}) {
    try {
      const {
        model = this.defaultModel,
        maxTokens = this.maxTokens,
        temperature = this.temperature,
        systemPrompt = "You are a helpful AI assistant."
      } = options;

      const formattedMessages = [
        { role: 'system', content: systemPrompt },
        ...messages
      ];

      const stream = await this.openai.chat.completions.create({
        model,
        messages: formattedMessages,
        max_tokens: maxTokens,
        temperature,
        stream: true,
      });

      return stream;
    } catch (error) {
      console.error('OpenAI streaming error:', error);
      throw new Error('Failed to create streaming response from OpenAI.');
    }
  }

  formatMessage(role, content) {
    return { role, content };
  }

  validateMessages(messages) {
    if (!Array.isArray(messages)) {
      throw new Error('Messages must be an array');
    }

    for (const message of messages) {
      if (!message.role || !message.content) {
        throw new Error('Each message must have role and content');
      }
      
      if (!['user', 'assistant', 'system'].includes(message.role)) {
        throw new Error('Message role must be user, assistant, or system');
      }
    }

    return true;
  }
}

module.exports = new OpenAIService();