#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

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

// Required files and directories
const requiredStructure = {
  'docker-compose.yml': 'file',
  '.env': 'file',
  '.env.example': 'file',
  'package.json': 'file',
  'README.md': 'file',
  'SETUP_GUIDE.md': 'file',
  'test_chatbot.js': 'file',
  'api/': 'directory',
  'api/package.json': 'file',
  'api/Dockerfile': 'file',
  'api/server.js': 'file',
  'api/healthcheck.js': 'file',
  'api/config/': 'directory',
  'api/config/redis.js': 'file',
  'api/controllers/': 'directory',
  'api/controllers/chatbotController.js': 'file',
  'api/services/': 'directory',
  'api/services/openaiService.js': 'file',
  'api/services/conversationService.js': 'file',
  'n8n/': 'directory',
  'n8n/workflows/': 'directory',
  'n8n/workflows/chatbot_workflow.json': 'file'
};

function checkFileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

function checkIsDirectory(dirPath) {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch (error) {
    return false;
  }
}

function validateJSON(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    JSON.parse(content);
    return true;
  } catch (error) {
    return false;
  }
}

function validateProject() {
  log('🔍 Validating GPT-4 + Redis + n8n Chatbot Project Structure', 'blue');
  log('─'.repeat(60), 'yellow');
  
  let allValid = true;
  const results = {};

  // Check structure
  for (const [itemPath, itemType] of Object.entries(requiredStructure)) {
    const fullPath = path.join(process.cwd(), itemPath);
    let isValid = false;
    
    if (itemType === 'file') {
      isValid = checkFileExists(fullPath) && !checkIsDirectory(fullPath);
    } else if (itemType === 'directory') {
      isValid = checkFileExists(fullPath) && checkIsDirectory(fullPath);
    }
    
    results[itemPath] = isValid;
    
    const icon = isValid ? '✅' : '❌';
    const color = isValid ? 'green' : 'red';
    log(`${icon} ${itemPath} (${itemType})`, color);
    
    if (!isValid) {
      allValid = false;
    }
  }

  log('\n🔍 Validating JSON Files', 'blue');
  log('─'.repeat(30), 'yellow');

  // Check JSON files
  const jsonFiles = [
    'package.json',
    'api/package.json',
    'n8n/workflows/chatbot_workflow.json'
  ];

  for (const jsonFile of jsonFiles) {
    const fullPath = path.join(process.cwd(), jsonFile);
    if (checkFileExists(fullPath)) {
      const isValidJSON = validateJSON(fullPath);
      const icon = isValidJSON ? '✅' : '❌';
      const color = isValidJSON ? 'green' : 'red';
      log(`${icon} ${jsonFile} (JSON syntax)`, color);
      
      if (!isValidJSON) {
        allValid = false;
      }
    }
  }

  log('\n🔍 Checking Configuration', 'blue');
  log('─'.repeat(25), 'yellow');

  // Check .env file content
  try {
    const envContent = fs.readFileSync('.env', 'utf8');
    const hasApiKey = envContent.includes('OPENAI_API_KEY=');
    const hasPlaceholder = envContent.includes('your_openai_api_key_here');
    
    if (hasApiKey && !hasPlaceholder) {
      log('✅ .env file has OpenAI API key configured', 'green');
    } else if (hasApiKey && hasPlaceholder) {
      log('⚠️  .env file needs OpenAI API key update', 'yellow');
    } else {
      log('❌ .env file missing OpenAI API key', 'red');
      allValid = false;
    }
  } catch (error) {
    log('❌ Cannot read .env file', 'red');
    allValid = false;
  }

  // Check package.json dependencies
  try {
    const apiPackage = JSON.parse(fs.readFileSync('api/package.json', 'utf8'));
    const requiredDeps = ['express', 'redis', 'openai', 'uuid', 'cors'];
    const missingDeps = requiredDeps.filter(dep => !apiPackage.dependencies[dep]);
    
    if (missingDeps.length === 0) {
      log('✅ All required dependencies present', 'green');
    } else {
      log(`❌ Missing dependencies: ${missingDeps.join(', ')}`, 'red');
      allValid = false;
    }
  } catch (error) {
    log('❌ Cannot validate API dependencies', 'red');
    allValid = false;
  }

  log('\n📋 Validation Summary', 'yellow');
  log('─'.repeat(20), 'yellow');
  
  const passedCount = Object.values(results).filter(Boolean).length;
  const totalCount = Object.keys(results).length;
  
  log(`Project Structure: ${passedCount}/${totalCount} items valid`);
  
  if (allValid) {
    log('\n🎉 Project validation passed! Your chatbot system is ready.', 'green');
    log('\nNext steps:', 'blue');
    log('1. Update your OpenAI API key in .env file', 'yellow');
    log('2. Run: docker-compose up -d (if Docker is available)', 'yellow');
    log('3. Or follow SETUP_GUIDE.md for local development', 'yellow');
    log('4. Test with: npm test', 'yellow');
  } else {
    log('\n❌ Project validation failed. Please check the issues above.', 'red');
    log('\nCommon fixes:', 'blue');
    log('- Ensure all files were created correctly', 'yellow');
    log('- Check JSON syntax in configuration files', 'yellow');
    log('- Verify directory structure', 'yellow');
  }

  return allValid;
}

// Run validation if script is executed directly
if (require.main === module) {
  const isValid = validateProject();
  process.exit(isValid ? 0 : 1);
}

module.exports = { validateProject };