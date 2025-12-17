const fs = require('fs');
const path = require('path');

const dotenvPath = path.join(process.cwd(), '.env');
if (fs.existsSync(dotenvPath)) {
  require('dotenv').config({ path: dotenvPath });
}

function readBoolean(value) {
  return String(value || '').toLowerCase() === 'true';
}

const config = {
  port: process.env.PORT ? Number(process.env.PORT) : 3000,
  loginUrl: process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com',
  apiVersion: process.env.SALESFORCE_API_VERSION || '60.0',
  clientId: process.env.SALESFORCE_CLIENT_ID || '',
  jwtUsername: process.env.SALESFORCE_USERNAME || '',
  jwtKeyPath:
    process.env.SALESFORCE_JWT_KEY_PATH || path.join(process.cwd(), 'sf_jwt.key'),
  knowledgeLanguage: process.env.SALESFORCE_KNOWLEDGE_LANGUAGE || 'en_US',
  articleObjectApiName: process.env.SALESFORCE_ARTICLE_OBJECT || 'Knowledge__kav',
  articleAdditionalFields: process.env.SALESFORCE_ARTICLE_ADDITIONAL_FIELDS || '',
  articleSelectAllFields: readBoolean(process.env.SALESFORCE_ARTICLE_SELECT_ALL_FIELDS),
  defaultSearchLimit: 20,
  maxSearchLimit: 50,

  validate() {
    const missing = [];

    if (!config.clientId) missing.push('SALESFORCE_CLIENT_ID');
    if (!config.jwtUsername) missing.push('SALESFORCE_USERNAME');

    if (missing.length) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    if (!config.jwtKeyPath) {
      throw new Error(
        'Missing Salesforce JWT key path. Set SALESFORCE_JWT_KEY_PATH or place sf_jwt.key in project root.'
      );
    }

    if (!fs.existsSync(config.jwtKeyPath)) {
      throw new Error(`Salesforce JWT key not found at ${config.jwtKeyPath}`);
    }
  },
};

module.exports = config;
