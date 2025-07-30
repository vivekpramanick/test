# GPT-4 + Redis + n8n Chatbot System

A comprehensive chatbot system that integrates OpenAI's GPT-4, Redis for conversation storage, and n8n for workflow automation.

## 🏗️ Architecture

- **GPT-4**: Advanced language model for generating intelligent responses
- **Redis**: Fast in-memory storage for conversation history and session management
- **n8n**: Workflow automation platform for orchestrating chatbot interactions
- **Node.js API**: Express.js backend service connecting all components
- **Docker**: Containerized deployment for easy setup and scaling

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

### Setup

1. **Clone and navigate to the project:**
   ```bash
   cd /workspace
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env and add your OpenAI API key
   ```

3. **Start the services:**
   ```bash
   docker-compose up -d
   ```

4. **Access the services:**
   - **n8n Workflow Editor**: http://localhost:5678
     - Username: `admin`
     - Password: `password`
   - **Chatbot API**: http://localhost:3000
   - **Redis**: localhost:6379

## 📡 API Endpoints

### Core Chat Endpoints

#### Send Message
```http
POST /api/chat
Content-Type: application/json

{
  "message": "Hello, how are you?",
  "sessionId": "optional-session-id",
  "options": {
    "temperature": 0.7,
    "maxTokens": 1000,
    "systemPrompt": "You are a helpful assistant."
  }
}
```

#### Stream Response
```http
POST /api/chat/stream
Content-Type: application/json

{
  "message": "Tell me a story",
  "sessionId": "session-123"
}
```

### Session Management

#### Create Session
```http
POST /api/chat/session
Content-Type: application/json

{
  "sessionId": "optional-custom-id"
}
```

#### Get Session
```http
GET /api/chat/session/{sessionId}
```

#### Get All Sessions
```http
GET /api/chat/sessions
```

#### Delete Session
```http
DELETE /api/chat/session/{sessionId}
```

### Conversation History

#### Get History
```http
GET /api/chat/history/{sessionId}?limit=50
```

#### Get Session Stats
```http
GET /api/chat/stats/{sessionId}
```

### Maintenance

#### Health Check
```http
GET /health
```

#### Cleanup Old Sessions
```http
POST /api/chat/cleanup
Content-Type: application/json

{
  "maxAge": 604800000
}
```

## 🔄 n8n Workflow

The included n8n workflow (`n8n/workflows/chatbot_workflow.json`) provides:

1. **Webhook Trigger**: Receives chat requests via HTTP
2. **API Integration**: Forwards requests to the Node.js chatbot API
3. **Error Handling**: Logs and handles API errors gracefully
4. **Response Formatting**: Returns structured responses to clients

### Webhook URL
Once n8n is running, the chatbot webhook will be available at:
```
http://localhost:5678/webhook/chat
```

### Using the Webhook
```bash
curl -X POST http://localhost:5678/webhook/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello from n8n!",
    "sessionId": "test-session"
  }'
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | Your OpenAI API key | Required |
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | API server port | `3000` |
| `REDIS_HOST` | Redis server host | `redis` |
| `REDIS_PORT` | Redis server port | `6379` |
| `ALLOWED_ORIGINS` | CORS allowed origins | `http://localhost:5678` |

### GPT-4 Options

Customize GPT-4 behavior via the `options` parameter:

```json
{
  "model": "gpt-4",
  "temperature": 0.7,
  "maxTokens": 1000,
  "systemPrompt": "Custom system prompt here"
}
```

## 📊 Redis Data Structure

### Session Storage
```redis
Key: chat:session:{sessionId}
TTL: 24 hours
Value: {
  "id": "session-uuid",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "lastActivity": "2024-01-01T01:00:00.000Z",
  "messages": [
    {
      "id": "message-uuid",
      "role": "user",
      "content": "Hello",
      "timestamp": "2024-01-01T00:30:00.000Z"
    }
  ]
}
```

## 🛠️ Development

### Running in Development Mode

1. **Start Redis and n8n:**
   ```bash
   docker-compose up redis n8n -d
   ```

2. **Install API dependencies:**
   ```bash
   cd api
   npm install
   ```

3. **Start the API in development mode:**
   ```bash
   npm run dev
   ```

### Project Structure

```
.
├── docker-compose.yml           # Container orchestration
├── .env.example                # Environment template
├── README.md                   # This file
│
├── api/                        # Node.js API service
│   ├── package.json           # Dependencies
│   ├── Dockerfile             # Container config
│   ├── server.js              # Main server file
│   ├── healthcheck.js         # Health check script
│   │
│   ├── config/
│   │   └── redis.js          # Redis connection
│   │
│   ├── controllers/
│   │   └── chatbotController.js  # API endpoints
│   │
│   └── services/
│       ├── openaiService.js     # GPT-4 integration
│       └── conversationService.js # Redis session management
│
└── n8n/
    └── workflows/
        └── chatbot_workflow.json  # n8n workflow config
```

## 🔍 Testing

### Test the API directly:
```bash
# Health check
curl http://localhost:3000/health

# Send a chat message
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, world!",
    "options": {
      "temperature": 0.8
    }
  }'
```

### Test via n8n webhook:
```bash
curl -X POST http://localhost:5678/webhook/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello via n8n!",
    "sessionId": "test-123"
  }'
```

## 🚨 Troubleshooting

### Common Issues

1. **OpenAI API Key Error**
   - Ensure your API key is correctly set in `.env`
   - Verify the key has sufficient credits

2. **Redis Connection Issues**
   - Check if Redis container is running: `docker ps`
   - Verify Redis logs: `docker logs chatbot_redis`

3. **n8n Workflow Not Working**
   - Import the workflow manually from `n8n/workflows/chatbot_workflow.json`
   - Verify the API service is accessible from n8n container

4. **CORS Issues**
   - Add your domain to `ALLOWED_ORIGINS` in `.env`
   - Restart the API service

### Logs

```bash
# View all service logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f chatbot_api
docker-compose logs -f chatbot_redis
docker-compose logs -f chatbot_n8n
```

## 🔒 Security Considerations

- Change default n8n credentials in production
- Use strong Redis passwords in production
- Implement proper API rate limiting
- Secure webhook endpoints
- Monitor OpenAI API usage and costs

## 🚀 Production Deployment

For production deployment:

1. **Use environment-specific configurations**
2. **Set up proper logging and monitoring**
3. **Configure Redis persistence and backups**
4. **Implement proper security measures**
5. **Set up SSL/TLS certificates**
6. **Configure proper resource limits**

## 📄 License

MIT License - Feel free to use this project for your own applications.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

---

Built with ❤️ using GPT-4, Redis, n8n, and Node.js