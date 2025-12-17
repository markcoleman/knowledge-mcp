const express = require('express');
const articlesRouter = require('./routes/articles');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandlers');
const { requestLogger } = require('./middleware/requestLogger');

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json());
  app.use(requestLogger());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/articles', articlesRouter);

  app.use(notFoundHandler());
  app.use(errorHandler());

  return app;
}

module.exports = {
  createApp,
};
