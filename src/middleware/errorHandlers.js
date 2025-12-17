function notFoundHandler() {
  return (req, res) => {
    res.status(404).json({
      error: {
        message: 'Not found',
      },
    });
  };
}

function errorHandler() {
  return (err, req, res, next) => {
    const status = err.statusCode || err.status || 500;
    res.status(status).json({
      error: {
        message: err.message || 'Unexpected error',
      },
    });
  };
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
