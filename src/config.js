const fs = require('fs');
const path = require('path');
const dotenvPath = path.join(process.cwd(), '.env');
if (fs.existsSync(dotenvPath)) {
  // Load environment variables when .env is present.
  require('dotenv').config({ path: dotenvPath });
}

const requiredEnv = ['SALESFORCE_CLIENT_ID', 'SALESFORCE_USERNAME'];

module.exports = {
  port: process.env.PORT ? Number(process.env.PORT) : 3000,
  loginUrl: process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com',
  apiVersion: process.env.SALESFORCE_API_VERSION || '60.0',
  clientId: process.env.SALESFORCE_CLIENT_ID || '',
  jwtUsername: process.env.SALESFORCE_USERNAME || '',
  jwtKeyPath: process.env.SALESFORCE_JWT_KEY_PATH || path.join(process.cwd(), 'sf_jwt.key'),
  knowledgeLanguage: process.env.SALESFORCE_KNOWLEDGE_LANGUAGE || 'en_US',
  articleObjectApiName: process.env.SALESFORCE_ARTICLE_OBJECT || 'Knowledge__kav',
  defaultSearchLimit: 20,
  maxSearchLimit: 50,
  requiredEnv,
};
