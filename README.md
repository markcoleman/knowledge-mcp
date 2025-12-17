# Knowledge MCP API

Lightweight Express API (pnpm) to search and fetch Salesforce Knowledge articles via SOQL over REST.

## Prereqs
- Node.js 18+ (tested with 20)
- pnpm installed (`npm install -g pnpm` if needed)
- Salesforce Connected App configured for JWT Bearer (server-to-server) with the `sf_jwt.crt` certificate uploaded

## Setup
1) Copy env template and fill in credentials:
   ```sh
   cp .env.example .env
   # edit .env with SALESFORCE_CLIENT_ID, SALESFORCE_USERNAME, and SALESFORCE_JWT_KEY_PATH (defaults to ./sf_jwt.key)
   ```
2) Install deps:
   ```sh
   pnpm install
   ```
3) Run locally:
   ```sh
   pnpm dev
   ```
   Server listens on `http://localhost:3000` by default.

## Logging
- Request logs are printed to the console with basic color coding.
- When `/articles/search` returns results, the server logs a green "Found N article(s)" line; no results logs a yellow line.
- Control verbosity with `LOG_LEVEL` (`debug`, `info`, `warn`, `error`, `silent`).

## Endpoints
- `GET /articles/search?q=printer&limit=20`
  - Searches published Knowledge articles by title in the configured language.
- `GET /articles/:id`
  - Fetches a single published Knowledge article by Id.

Both endpoints return `{ data: ... }` on success and `{ error: { message } }` on failure.

## Notes
- SOQL queries use the `Knowledge__kav` object by default; override with `SALESFORCE_ARTICLE_OBJECT` if your org differs.
- Token retrieval uses the OAuth 2.0 JWT Bearer grant against `SALESFORCE_LOGIN_URL` and caches until near expiry.
- Language filter defaults to `en_US` via `SALESFORCE_KNOWLEDGE_LANGUAGE`.
- Article body field defaults to `ArticleBody`; override with `SALESFORCE_ARTICLE_BODY_FIELD` if your article type uses a different rich text/answer field.
- Add extra fields to query with `SALESFORCE_ARTICLE_ADDITIONAL_FIELDS` (comma-separated, e.g., `Content__c,Question__c`).
- To return every queryable field from the article object, set `SALESFORCE_ARTICLE_SELECT_ALL_FIELDS=true` (uses the object describe; may increase payload size).

## JWT setup quickstart

1) Generate keypair (private key stays local, cert uploaded to the Connected App):
   ```sh
   openssl genrsa -out sf_jwt.key 2048
   openssl req -new -x509 -key sf_jwt.key -out sf_jwt.crt -days 3650 -subj "/CN=sf-jwt"
   ```
2) In Salesforce, edit the Connected App:
   - Upload `sf_jwt.crt` under "Use digital signatures for OAuth".
   - Enable OAuth settings with the JWT Bearer flow.
   - Add the user specified in `SALESFORCE_USERNAME` to the app's profile/permission set.
3) Run the API using the `.env` values described above.


- setup the user
- assign permissions
- connected app
- cert upload
- permisssion set
- assign user to permission set
- assign permission set to the connected app
- assign knowledge manager to integration user
- if your article type uses a custom body field, set `SALESFORCE_ARTICLE_BODY_FIELD` in `.env`
- if you want additional fields returned (e.g., `Content__c`, `Question__c`), set `SALESFORCE_ARTICLE_ADDITIONAL_FIELDS`
- set `SALESFORCE_ARTICLE_SELECT_ALL_FIELDS=true` if you want every queryable field returned