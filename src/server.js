const express = require('express');
const config = require('./config');
const articlesRouter = require('./routes/articles');

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/articles', articlesRouter);

// Error handler to normalize error responses.
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  const status = err.statusCode || 500;
  res.status(status).json({
    error: {
      message: err.message || 'Unexpected error',
    },
  });
});

app.listen(config.port, () => {
  console.log(`API listening on port ${config.port}`);
});
