/**
 * Error Handler Middleware
 */

const errorHandler = (err, req, res, next) => {
    console.error('Error:', err.stack);
    
    const statusCode = err.status || 500;
    const message = err.message || 'Internal server error';
    
    res.status(statusCode).json({
        success: false,
        message: message,
        ...(process.env.NODE_ENV === 'development' && {
            stack: err.stack,
        }),
    });
};

// Simple AppError class
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.status = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = { errorHandler, AppError };