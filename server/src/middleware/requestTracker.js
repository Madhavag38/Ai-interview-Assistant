/**
 * Request Tracker Middleware
 */

const { v4: uuidv4 } = require('uuid');

const requestLogger = (req, res, next) => {
    // Generate unique request ID
    const requestId = req.headers['x-request-id'] || uuidv4();
    req.requestId = requestId;
    
    // Add request ID to response headers
    res.setHeader('X-Request-ID', requestId);
    
    // Log request
    console.log(`[${requestId}] ${req.method} ${req.path} - ${req.ip}`);
    
    // Track response time
    const startTime = Date.now();
    const originalSend = res.send;
    
    res.send = function(data) {
        const duration = Date.now() - startTime;
        console.log(`[${requestId}] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
        originalSend.call(this, data);
    };
    
    next();
};

module.exports = { requestLogger };