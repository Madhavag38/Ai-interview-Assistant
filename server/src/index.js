/**
 * AI Interview Assistant - Server
 */

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

// Import your existing files
const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const interviewRoutes = require("./routes/interview");
const resumeRoutes = require("./routes/resume");

// Import middleware (we'll create these)
const { errorHandler } = require("./middleware/errorHandler");
const { securityHeaders } = require("./middleware/security");
const { requestLogger } = require("./middleware/requestTracker");

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

connectDB();

// ============================================================================
// INITIALIZE APP
// ============================================================================

const app = express();

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================

// 1. Helmet - Security headers
app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

// 2. CORS
app.use(cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 3. Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests
    message: 'Too many requests from this IP. Please try again later.',
});
app.use('/api', limiter);

// Stricter limit for auth
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many authentication attempts. Please try again later.',
});
app.use('/api/auth', authLimiter);

// 4. Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// 5. Compression
app.use(compression());

// 6. Logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// 7. Custom middleware
app.use(securityHeaders);
app.use(requestLogger);

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    });
});

// ============================================================================
// API ROUTES
// ============================================================================

app.use("/api/auth", authRoutes);
app.use("/api/interviews", interviewRoutes);
app.use("/api/resume", resumeRoutes);

// Welcome route
app.get("/", (req, res) => {
    res.json({
        name: 'AI Interview Assistant',
        version: '1.0.0',
        status: 'operational',
        endpoints: {
            auth: '/api/auth',
            resume: '/api/resume',
            interviews: '/api/interviews',
            health: '/health',
        },
    });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`,
    });
});

// Global error handler
app.use(errorHandler);

// ============================================================================
// START SERVER
// ============================================================================

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        mongoose.connection.close(false, () => {
            console.log('Process terminated.');
            process.exit(0);
        });
    });
});

module.exports = app;