#!/usr/bin/env node

const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:3000';
const N8N_WEBHOOK_URL = 'http://localhost:5678/webhook/chat';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Test functions
async function testHealthCheck() {
  try {
    log('\n🏥 Testing health check...', 'blue');
    const response = await axios.get(`${API_BASE_URL}/health`);
    log(`✅ Health check passed: ${JSON.stringify(response.data)}`, 'green');
    return true;
  } catch (error) {
    log(`❌ Health check failed: ${error.message}`, 'red');
    return false;
  }
}

async function testDirectChatAPI() {
  try {
    log('\n💬 Testing direct chat API...', 'blue');
    
    const chatData = {
      message: "Hello! Can you tell me a short joke?",
      options: {
        temperature: 0.8,
        maxTokens: 150
      }
    };

    const response = await axios.post(`${API_BASE_URL}/api/chat`, chatData, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });

    log(`✅ Chat API response received:`, 'green');
    log(`📨 Message: ${response.data.message}`);
    log(`🆔 Session ID: ${response.data.sessionId}`);
    log(`🤖 Model: ${response.data.model}`);
    
    return response.data.sessionId;
  } catch (error) {
    log(`❌ Direct chat API failed: ${error.message}`, 'red');
    if (error.response) {
      log(`Response data: ${JSON.stringify(error.response.data)}`, 'red');
    }
    return null;
  }
}

async function testSessionManagement(sessionId) {
  try {
    log('\n📋 Testing session management...', 'blue');
    
    // Get session info
    const sessionResponse = await axios.get(`${API_BASE_URL}/api/chat/session/${sessionId}`);
    log(`✅ Session retrieved: ${sessionResponse.data.messages.length} messages`, 'green');
    
    // Get conversation history
    const historyResponse = await axios.get(`${API_BASE_URL}/api/chat/history/${sessionId}`);
    log(`✅ History retrieved: ${historyResponse.data.count} messages`, 'green');
    
    // Get session stats
    const statsResponse = await axios.get(`${API_BASE_URL}/api/chat/stats/${sessionId}`);
    log(`✅ Stats retrieved: ${JSON.stringify(statsResponse.data)}`, 'green');
    
    return true;
  } catch (error) {
    log(`❌ Session management failed: ${error.message}`, 'red');
    return false;
  }
}

async function testContinuedConversation(sessionId) {
  try {
    log('\n🔄 Testing continued conversation...', 'blue');
    
    const followUpData = {
      message: "That was funny! Can you tell me another one?",
      sessionId: sessionId
    };

    const response = await axios.post(`${API_BASE_URL}/api/chat`, followUpData, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });

    log(`✅ Follow-up response received:`, 'green');
    log(`📨 Message: ${response.data.message}`);
    
    return true;
  } catch (error) {
    log(`❌ Continued conversation failed: ${error.message}`, 'red');
    return false;
  }
}

async function testN8nWebhook() {
  try {
    log('\n🔗 Testing n8n webhook integration...', 'blue');
    
    const webhookData = {
      message: "Hello from n8n test! How are you today?",
      sessionId: "n8n-test-session"
    };

    const response = await axios.post(N8N_WEBHOOK_URL, webhookData, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });

    log(`✅ n8n webhook response received:`, 'green');
    log(`📨 Message: ${response.data.message}`);
    log(`🆔 Session ID: ${response.data.sessionId}`);
    
    return true;
  } catch (error) {
    log(`❌ n8n webhook failed: ${error.message}`, 'red');
    if (error.response) {
      log(`Response status: ${error.response.status}`, 'red');
      log(`Response data: ${JSON.stringify(error.response.data)}`, 'red');
    }
    return false;
  }
}

async function testAllSessions() {
  try {
    log('\n📊 Testing session listing...', 'blue');
    
    const response = await axios.get(`${API_BASE_URL}/api/chat/sessions`);
    log(`✅ Sessions listed: ${response.data.count} total sessions`, 'green');
    
    return true;
  } catch (error) {
    log(`❌ Session listing failed: ${error.message}`, 'red');
    return false;
  }
}

// Main test runner
async function runAllTests() {
  log('🚀 Starting GPT-4 + Redis + n8n Chatbot System Tests', 'yellow');
  
  const results = {
    healthCheck: false,
    directChat: false,
    sessionManagement: false,
    continuedConversation: false,
    n8nWebhook: false,
    sessionListing: false
  };

  let sessionId = null;
  
  // Test 1: Health Check
  results.healthCheck = await testHealthCheck();
  
  if (!results.healthCheck) {
    log('\n❌ Health check failed. Make sure the API server is running.', 'red');
    log('Run: docker-compose up -d', 'yellow');
    return;
  }

  // Test 2: Direct Chat API
  sessionId = await testDirectChatAPI();
  results.directChat = sessionId !== null;

  if (!results.directChat) {
    log('\n❌ Direct chat API failed. Check your OpenAI API key.', 'red');
    return;
  }

  // Test 3: Session Management
  if (sessionId) {
    results.sessionManagement = await testSessionManagement(sessionId);
    
    // Test 4: Continued Conversation
    if (results.sessionManagement) {
      results.continuedConversation = await testContinuedConversation(sessionId);
    }
  }

  // Test 5: Session Listing
  results.sessionListing = await testAllSessions();

  // Test 6: n8n Webhook Integration
  results.n8nWebhook = await testN8nWebhook();

  // Summary
  log('\n📋 Test Results Summary:', 'yellow');
  log('─'.repeat(50), 'yellow');
  
  Object.entries(results).forEach(([test, passed]) => {
    const icon = passed ? '✅' : '❌';
    const color = passed ? 'green' : 'red';
    log(`${icon} ${test}: ${passed ? 'PASSED' : 'FAILED'}`, color);
  });

  const passedCount = Object.values(results).filter(Boolean).length;
  const totalCount = Object.keys(results).length;
  
  log('\n📊 Overall Result:', 'yellow');
  log(`${passedCount}/${totalCount} tests passed`, passedCount === totalCount ? 'green' : 'red');

  if (passedCount === totalCount) {
    log('\n🎉 All tests passed! Your chatbot system is working correctly.', 'green');
  } else {
    log('\n⚠️  Some tests failed. Check the logs above for details.', 'yellow');
  }
}

// Handle command line execution
if (require.main === module) {
  runAllTests().catch(error => {
    log(`\n💥 Test runner crashed: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { runAllTests, testHealthCheck, testDirectChatAPI, testN8nWebhook };