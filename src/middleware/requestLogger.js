const kleur = require('kleur');
const { logger } = require('../lib/logger');

function requestLogger() {
  return (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
      const ms = Date.now() - start;
      const status = res.statusCode;
      const statusColored =
        status >= 500
          ? kleur.red().bold(String(status))
          : status >= 400
            ? kleur.yellow(String(status))
            : kleur.green(String(status));
      const line = `${kleur.dim(req.method)} ${req.originalUrl} ${statusColored} ${kleur.gray(
        `${ms}ms`
      )}`;

      // Keep logs quiet for health checks.
      if (req.path === '/health') {
        return;
      }

      logger.info(line);
    });

    next();
  };
}

module.exports = {
  requestLogger,
};
