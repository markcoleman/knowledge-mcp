function requestLogger() {
  return (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
      const ms = Date.now() - start;
      const line = `${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`;

      // Keep logs quiet for health checks.
      if (req.path === '/health') {
        return;
      }

      // eslint-disable-next-line no-console
      console.log(line);
    });

    next();
  };
}

module.exports = {
  requestLogger,
};
