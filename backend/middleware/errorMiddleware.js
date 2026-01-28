function errorHandler(err, req, res, next) {
    console.error(err);
    res.status(500).json({ error: 'internal server error', message: err.message });
}

module.exports = errorHandler;
