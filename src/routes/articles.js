const express = require('express');
const salesforceClient = require('../services/salesforceClient');
const kleur = require('kleur');
const { logger } = require('../lib/logger');

const router = express.Router();

router.get('/search', async (req, res, next) => {
  try {
    const { q, limit } = req.query;
    const records = await salesforceClient.searchArticles({ term: q, limit });

    const queryLabel = kleur.cyan(String(q || '').trim() || '(empty)');
    if (records.length > 0) {
      logger.success(`Found ${records.length} article(s) for q=${queryLabel}`);
    } else {
      logger.warn(`No articles found for q=${queryLabel}`);
    }

    res.json({ data: records });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const article = await salesforceClient.getArticleById(req.params.id);

    const idLabel = kleur.cyan(req.params.id);
    const titleLabel = article?.Title ? kleur.green(`"${article.Title}"`) : '(no title)';
    logger.success(`Fetched article ${idLabel} ${titleLabel}`);

    res.json({ data: article });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
