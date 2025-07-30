# Setup Guide for GPT-4 + Redis + n8n Chatbot

## Option 1: Docker Setup (Recommended)

### Prerequisites
- Docker (v20.0 or later)
- Docker Compose (v2.0 or later)
- OpenAI API key

### Quick Start
```bash
# 1. Set up environment
cp .env.example .env
# Edit .env and add your OpenAI API key

# 2. Start all services
docker-compose up -d

# 3. Wait for services to initialize (30-60 seconds)
docker-compose logs -f

# 4. Test the system
npm test
```

### Access Points
- **n8n Interface**: http://localhost:5678 (admin/password)
- **API Docs**: http://localhost:3000
- **Redis**: localhost:6379

## Option 2: Local Development Setup

### Prerequisites
- Node.js (v16 or later)
- Redis server
- n8n (global installation)
- OpenAI API key

### Step-by-Step Setup

1. **Install Redis**
   ```bash
   # Ubuntu/Debian
   sudo apt update && sudo apt install redis-server
   sudo systemctl start redis-server
   
   # macOS
   brew install redis
   brew services start redis
   
   # Windows
   # Download from https://redis.io/download
   ```

2. **Install n8n globally**
   ```bash
   npm install -g n8n
   ```

3. **Set up the API service**
   ```bash
   cd api
   npm install
   ```

4. **Configure environment**
   ```bash
   # Copy and edit environment file
   cp .env.example .env
   # Update Redis host to localhost
   # REDIS_HOST=localhost
   ```

5. **Start services separately**
   ```bash
   # Terminal 1: Start n8n
   n8n start
   
   # Terminal 2: Start the API
   cd api
   npm run dev
   
   # Terminal 3: Verify Redis
   redis-cli ping
   ```

6. **Import n8n workflow**
   - Open http://localhost:5678
   - Go to Workflows
   - Import from `n8n/workflows/chatbot_workflow.json`

## Option 3: Cloud Deployment

### Using DigitalOcean/AWS/GCP

1. **Create a VM instance**
   - Ubuntu 20.04 LTS or later
   - Minimum 2GB RAM, 1 CPU
   - Open ports: 22, 80, 443, 3000, 5678

2. **Install Docker**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   ```

3. **Deploy the application**
   ```bash
   git clone <your-repo>
   cd gpt4-redis-n8n-chatbot
   cp .env.example .env
   # Edit .env with your OpenAI API key
   sudo docker-compose up -d
   ```

4. **Set up reverse proxy (Optional)**
   ```bash
   # Install nginx
   sudo apt install nginx
   # Configure SSL with Let's Encrypt
   sudo apt install certbot python3-certbot-nginx
   ```

## Configuration Guide

### Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `OPENAI_API_KEY` | Yes | Your OpenAI API key | `sk-...` |
| `NODE_ENV` | No | Environment mode | `production` |
| `REDIS_HOST` | No | Redis hostname | `localhost` |
| `REDIS_PORT` | No | Redis port | `6379` |
| `ALLOWED_ORIGINS` | No | CORS origins | `http://localhost:5678` |

### OpenAI API Key Setup

1. Visit https://platform.openai.com/api-keys
2. Create a new API key
3. Add it to your `.env` file
4. Ensure you have sufficient credits

### n8n Workflow Configuration

The workflow includes:
- **Webhook trigger** at `/webhook/chat`
- **HTTP request** to the API service
- **Error handling** and logging
- **Response formatting**

To customize:
1. Open n8n at http://localhost:5678
2. Edit the imported workflow
3. Modify endpoints, add authentication, etc.
4. Save and activate the workflow

## Testing

### Automated Testing
```bash
# Run all tests
npm test

# Test specific components
node test_chatbot.js
```

### Manual Testing

1. **Test API directly**
   ```bash
   curl -X POST http://localhost:3000/api/chat \
     -H "Content-Type: application/json" \
     -d '{"message": "Hello, world!"}'
   ```

2. **Test via n8n webhook**
   ```bash
   curl -X POST http://localhost:5678/webhook/chat \
     -H "Content-Type: application/json" \
     -d '{"message": "Hello from n8n!"}'
   ```

3. **Test conversation persistence**
   ```bash
   # First message
   curl -X POST http://localhost:3000/api/chat \
     -H "Content-Type: application/json" \
     -d '{"message": "My name is John"}'
   
   # Follow-up (use sessionId from first response)
   curl -X POST http://localhost:3000/api/chat \
     -H "Content-Type: application/json" \
     -d '{"message": "What is my name?", "sessionId": "session-uuid"}'
   ```

## Troubleshooting

### Common Issues

1. **"OpenAI API key not found"**
   - Check your `.env` file
   - Ensure `OPENAI_API_KEY` is set correctly
   - Restart the API service

2. **"Redis connection failed"**
   - Verify Redis is running: `redis-cli ping`
   - Check Redis host/port in `.env`
   - For Docker: ensure containers are on same network

3. **"n8n webhook not responding"**
   - Import the workflow from `n8n/workflows/`
   - Activate the workflow in n8n interface
   - Check n8n logs for errors

4. **"Cannot connect to API from n8n"**
   - For Docker: use service name `chatbot_api:3000`
   - For local: use `localhost:3000` or `127.0.0.1:3000`

### Logs and Debugging

```bash
# Docker logs
docker-compose logs -f chatbot_api
docker-compose logs -f chatbot_redis
docker-compose logs -f chatbot_n8n

# Check service status
docker-compose ps

# Restart specific service
docker-compose restart chatbot_api
```

### Performance Tuning

1. **Redis Configuration**
   - Increase memory limit for large conversations
   - Enable persistence for data durability
   - Configure eviction policies

2. **API Optimization**
   - Adjust rate limiting settings
   - Configure session TTL
   - Enable compression

3. **n8n Scaling**
   - Use database backend instead of SQLite
   - Configure queue mode for high traffic
   - Set up multiple worker instances

## Security Considerations

### Production Checklist

- [ ] Change default n8n credentials
- [ ] Use strong Redis password
- [ ] Enable HTTPS/SSL certificates
- [ ] Configure firewall rules
- [ ] Set up API authentication
- [ ] Monitor OpenAI usage and costs
- [ ] Regular security updates
- [ ] Backup Redis data
- [ ] Set up logging and monitoring

### API Security

```bash
# Example nginx configuration for SSL
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Scaling and Production

### Horizontal Scaling
- Use Redis Cluster for high availability
- Deploy multiple API instances behind load balancer
- Set up n8n in queue mode with multiple workers

### Monitoring
- Set up health checks for all services
- Monitor Redis memory usage
- Track OpenAI API usage and costs
- Set up alerts for service failures

### Backup Strategy
- Regular Redis snapshots
- n8n workflow exports
- Environment configuration backups
- Database backups (if using external DB)

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review service logs
3. Test individual components
4. Check OpenAI API status
5. Verify environment configuration

For development:
- API documentation at http://localhost:3000
- n8n documentation at https://docs.n8n.io
- Redis documentation at https://redis.io/documentation