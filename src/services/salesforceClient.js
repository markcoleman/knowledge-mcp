const fs = require('fs');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { createHttpError } = require('../lib/httpError');

let cachedToken = null;
let tokenExpiresAt = 0;
let instanceUrl = null;

const TOKEN_EXPIRY_BUFFER_MS = 60 * 1000; // Refresh 1 minute before expiry.

let privateKeyCache = null;
let describedFieldCache = null;

function getPrivateKey() {
  if (privateKeyCache) {
    return privateKeyCache;
  }

  // config.validate() checks existence, but keep this defensive for unit usage.
  if (!config.jwtKeyPath) {
    throw new Error(
      'Missing Salesforce JWT key path. Set SALESFORCE_JWT_KEY_PATH or place sf_jwt.key in project root.',
    );
  }

  if (!fs.existsSync(config.jwtKeyPath)) {
    throw new Error(`Salesforce JWT key not found at ${config.jwtKeyPath}`);
  }

  privateKeyCache = fs.readFileSync(config.jwtKeyPath, 'utf8');
  return privateKeyCache;
}

function buildJwtAssertion() {
  if (!config.clientId) {
    throw new Error('Missing Salesforce client id. Set SALESFORCE_CLIENT_ID.');
  }
  if (!config.jwtUsername) {
    throw new Error('Missing Salesforce username. Set SALESFORCE_USERNAME.');
  }

  const audience = config.loginUrl.replace(/\/$/, '');
  const claims = {
    iss: config.clientId,
    sub: config.jwtUsername,
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 3 * 60, // 3 minutes ahead to avoid drift issues.
  };

  const privateKey = getPrivateKey();
  return jwt.sign(claims, privateKey, { algorithm: 'RS256' });
}

async function fetchAccessToken() {
  const url = `${config.loginUrl.replace(/\/$/, '')}/services/oauth2/token`;

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: buildJwtAssertion(),
  });

  try {
    const response = await axios.post(url, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const {
      access_token: token,
      instance_url: sfInstanceUrl,
      expires_in: expiresIn,
    } = response.data || {};

    if (!token || !sfInstanceUrl) {
      throw new Error('Salesforce token response missing access_token or instance_url.');
    }

    cachedToken = token;
    instanceUrl = sfInstanceUrl.replace(/\/$/, '');
    const expiresInMs = (Number(expiresIn) || 3600) * 1000;
    tokenExpiresAt = Date.now() + expiresInMs - TOKEN_EXPIRY_BUFFER_MS;

    return cachedToken;
  } catch (error) {
    const status = error.response?.status;
    const message =
      error.response?.data?.error_description || error.response?.data?.error || error.message;
    throw new Error(
      `Failed to fetch Salesforce access token${status ? ` (${status})` : ''}: ${message}`,
    );
  }
}

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }
  return fetchAccessToken();
}

async function salesforceGet(pathname, { params } = {}) {
  const token = await getAccessToken();
  if (!instanceUrl) {
    throw new Error('Salesforce instance URL is not set after authentication.');
  }

  const url = `${instanceUrl}${pathname}`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      params,
    });

    return response.data;
  } catch (error) {
    const status = error.response?.status;
    const message =
      error.response?.data?.[0]?.message || error.response?.data?.message || error.message;
    throw new Error(`Salesforce request failed${status ? ` (${status})` : ''}: ${message}`);
  }
}

async function executeSoql(soql) {
  return salesforceGet(`/services/data/v${config.apiVersion}/query`, { params: { q: soql } });
}

function sanitizeQueryTerm(term) {
  // Basic sanitization to reduce SOQL injection risk; still rely on server-side profiles/permissions.
  return term.replace(/['\\]/g, '').trim();
}

function parseAdditionalFields(csv) {
  return String(csv || '')
    .split(',')
    .map((f) => f.trim())
    .filter(Boolean);
}

async function describeAllFields() {
  if (describedFieldCache) {
    return describedFieldCache;
  }

  const data = await salesforceGet(
    `/services/data/v${config.apiVersion}/sobjects/${config.articleObjectApiName}/describe`,
  );

  const fields = Array.isArray(data.fields) ? data.fields.map((f) => f?.name).filter(Boolean) : [];

  if (!fields.length) {
    throw new Error(
      `No fields found from describe for ${config.articleObjectApiName}. Check object name/permissions.`,
    );
  }

  describedFieldCache = fields;
  return describedFieldCache;
}

async function getArticleFields() {
  const baseFields = [
    'Id',
    'Title',
    'Summary',
    'UrlName',
    'Language',
    'PublishStatus',
    'LastPublishedDate',
    'ArticleNumber',
  ];

  if (config.articleSelectAllFields) {
    const described = await describeAllFields();
    // Keep stable ordering (describe order), de-dupe for safety.
    return Array.from(new Set([...described]));
  }

  return Array.from(new Set([...baseFields]));
}

async function searchArticles({ term, limit }) {
  if (!term || !String(term).trim()) {
    throw createHttpError(400, 'Search term is required');
  }

  const safeTerm = sanitizeQueryTerm(String(term));
  const limitValue = Math.min(
    Math.max(Number(limit) || config.defaultSearchLimit, 1),
    config.maxSearchLimit,
  );

  const fields = await getArticleFields();

  const soql = `SELECT ${fields.join(', ')} FROM ${config.articleObjectApiName} WHERE PublishStatus = 'Online' AND Language = '${config.knowledgeLanguage}' AND Title LIKE '%${safeTerm}%' ORDER BY LastPublishedDate DESC LIMIT ${limitValue}`;

  const data = await executeSoql(soql);
  return Array.isArray(data.records) ? data.records : [];
}

async function getArticleById(id) {
  if (!id || !/^[A-Za-z0-9]{15,18}$/.test(id)) {
    throw createHttpError(
      400,
      'A valid Salesforce article Id (15-18 alphanumeric chars) is required',
    );
  }

  const fields = await getArticleFields();

  const soql = `SELECT ${fields.join(', ')} FROM ${config.articleObjectApiName} WHERE PublishStatus = 'Online' AND Language = '${config.knowledgeLanguage}' AND Id = '${id}' LIMIT 1`;

  const data = await executeSoql(soql);
  const record = Array.isArray(data.records) ? data.records[0] : null;
  if (!record) {
    throw createHttpError(404, 'Article not found');
  }
  return record;
}

module.exports = {
  searchArticles,
  getArticleById,
};
