function errorHandler(err, req, res, next) {
    if (res.headersSent) {
        return next(err);
    }

    if (err && err.type === 'entity.parse.failed') {
        return res.status(400).json({
            error: 'invalid_json',
            message: 'Request body must be valid JSON.'
        });
    }

    const statusCode = Number(err && err.statusCode) || Number(err && err.status) || 500;
    const safeStatus = statusCode >= 400 && statusCode < 600 ? statusCode : 500;
    const message = (err && err.message) ? err.message : 'internal server error';

    if (safeStatus >= 500) {
        console.error(err);
    }

    return res.status(safeStatus).json({
        error: safeStatus >= 500 ? 'internal_server_error' : 'request_failed',
        message
    });
}

module.exports = errorHandler;
