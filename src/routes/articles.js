const express = require('express');
const salesforceClient = require('../salesforceClient');

const router = express.Router();

router.get('/search', async (req, res, next) => {
  try {
    const { q, limit } = req.query;
    const records = await salesforceClient.searchArticles({ term: q, limit });
    res.json({ data: records });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const article = await salesforceClient.getArticleById(req.params.id);
    res.json({ data: article });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
