/**
 * User Model - Enhanced with security features
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name'],
        trim: true,
        maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please provide a valid email',
        ],
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: [8, 'Password must be at least 8 characters'],
        select: false,
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
    },
    // Email verification
    isEmailVerified: {
        type: Boolean,
        default: false,
    },
    verificationToken: String,
    verificationTokenExpiry: Date,
    // Password reset
    resetPasswordToken: String,
    resetPasswordExpiry: Date,
    // Security
    loginAttempts: {
        type: Number,
        default: 0,
    },
    lockUntil: Date,
    lastLogin: Date,
    // Profile
    profile: {
        phone: String,
        location: String,
        linkedin: String,
        github: String,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ verificationToken: 1 });

// ============================================================================
// PRE-SAVE HOOK - Hash password
// ============================================================================

userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// ============================================================================
// INSTANCE METHODS
// ============================================================================

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT Access Token
userSchema.methods.generateAccessToken = function() {
    return jwt.sign(
        { id: this._id, email: this.email, role: this.role },
        process.env.JWT_ACCESS_SECRET || 'access_secret',
        { expiresIn: '7d' }
    );
};

// Generate Refresh Token
userSchema.methods.generateRefreshToken = function() {
    return jwt.sign(
        { id: this._id },
        process.env.JWT_REFRESH_SECRET || 'refresh_secret',
        { expiresIn: '30d' }
    );
};

// Generate verification token
userSchema.methods.generateVerificationToken = function() {
    const token = crypto.randomBytes(32).toString('hex');
    this.verificationToken = token;
    this.verificationTokenExpiry = Date.now() + 24 * 60 * 60 * 1000;
    return token;
};

// Generate password reset token
userSchema.methods.generateResetToken = function() {
    const token = crypto.randomBytes(32).toString('hex');
    this.resetPasswordToken = token;
    this.resetPasswordExpiry = Date.now() + 60 * 60 * 1000;
    return token;
};

// Remove sensitive data when converting to JSON
userSchema.methods.toJSON = function() {
    const obj = this.toObject();
    delete obj.password;
    delete obj.verificationToken;
    delete obj.verificationTokenExpiry;
    delete obj.resetPasswordToken;
    delete obj.resetPasswordExpiry;
    delete obj.loginAttempts;
    delete obj.lockUntil;
    return obj;
};

// ============================================================================
// STATIC METHODS
// ============================================================================

userSchema.statics.findByEmail = function(email) {
    return this.findOne({ email, isActive: true });
};

userSchema.statics.findByVerificationToken = function(token) {
    return this.findOne({
        verificationToken: token,
        verificationTokenExpiry: { $gt: Date.now() },
        isActive: true,
    });
};

userSchema.statics.findByResetToken = function(token) {
    return this.findOne({
        resetPasswordToken: token,
        resetPasswordExpiry: { $gt: Date.now() },
        isActive: true,
    });
};

const User = mongoose.model('User', userSchema);

module.exports = User;