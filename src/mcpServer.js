const { Server } = require('@modelcontextprotocol/sdk/server');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const config = require('./config');
const salesforceClient = require('./services/salesforceClient');
const { logger } = require('./lib/logger');

// Validate configuration before starting MCP server
config.validate();

// Create MCP server instance
const server = new Server(
  {
    name: 'knowledge-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Register the search articles tool
server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      {
        name: 'search_articles',
        description:
          'Search Salesforce Knowledge articles by title. Returns published articles matching the search term in the configured language.',
        inputSchema: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              description: 'Search term to match against article titles',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (1-50, default 20)',
              minimum: 1,
              maximum: 50,
            },
          },
          required: ['q'],
        },
      },
      {
        name: 'get_article',
        description:
          'Fetch a single Salesforce Knowledge article by its ID. Returns the full article details if found and published.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Salesforce article ID (15-18 alphanumeric characters)',
              pattern: '^[A-Za-z0-9]{15,18}$',
            },
          },
          required: ['id'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'search_articles') {
      const { q, limit } = args;

      logger.info(`MCP: Searching articles with q="${q}", limit=${limit || 20}`);
      const records = await salesforceClient.searchArticles({ term: q, limit });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                count: records.length,
                data: records,
              },
              null,
              2,
            ),
          },
        ],
      };
    } else if (name === 'get_article') {
      const { id } = args;

      logger.info(`MCP: Fetching article with id="${id}"`);
      const article = await salesforceClient.getArticleById(id);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                data: article,
              },
              null,
              2,
            ),
          },
        ],
      };
    } else {
      throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    logger.error(`MCP error in ${name}:`, error.message);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error: {
                message: error.message,
                tool: name,
              },
            },
            null,
            2,
          ),
        },
      ],
      isError: true,
    };
  }
});

// Start the server with stdio transport
async function startMcpServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('MCP server started on stdio');
}

// Handle process termination
process.on('SIGINT', async () => {
  logger.info('MCP server shutting down...');
  await server.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('MCP server shutting down...');
  await server.close();
  process.exit(0);
});

// Start the server
startMcpServer().catch((error) => {
  logger.error('Failed to start MCP server:', error);
  process.exit(1);
});
