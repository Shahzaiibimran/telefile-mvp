"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const auth_1 = require("../config/auth");
/**
 * Middleware to authenticate user with JWT
 */
const authenticate = async (req, res, next) => {
    var _a;
    try {
        // Get token from header
        const token = (_a = req.header('Authorization')) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
        if (!token) {
            console.log('Authentication failed: No token provided');
            res.status(401).json({ message: 'No authentication token, access denied' });
            return;
        }
        try {
            // Verify token
            // @ts-ignore - JWT verify has complex typings that are hard to satisfy
            const decoded = jsonwebtoken_1.default.verify(token, auth_1.authConfig.jwtSecret);
            // Find user by id
            const user = await User_1.default.findById(decoded.userId);
            if (!user) {
                console.log(`Authentication failed: User ID ${decoded.userId} not found`);
                res.status(401).json({ message: 'User not found, access denied' });
                return;
            }
            // Add user to request
            req.user = user;
            req.userId = decoded.userId;
            next();
        }
        catch (error) {
            // Check if token is expired
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                console.log('Authentication failed: Token expired');
                res.status(401).json({ message: 'Token has expired', code: 'TOKEN_EXPIRED' });
            }
            else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                console.log('Authentication failed: Invalid token');
                res.status(401).json({ message: 'Token is invalid', code: 'TOKEN_INVALID' });
            }
            else {
                console.error('Authentication error:', error);
                res.status(401).json({ message: 'Authentication failed' });
            }
        }
    }
    catch (error) {
        console.error('Unexpected error in auth middleware:', error);
        res.status(500).json({ message: 'Server error during authentication' });
    }
};
exports.authenticate = authenticate;
/**
 * Middleware to check if user is admin
 */
const isAdmin = (req, res, next) => {
    console.log('Running isAdmin middleware check...');
    console.log('Request URL:', req.originalUrl);
    console.log('Request method:', req.method);
    console.log('Request headers:', req.headers);
    if (!req.user) {
        console.error('Access denied: No user in request');
        res.status(403).json({ message: 'Access denied, admin rights required' });
        return;
    }
    // Explicitly check is_admin flag type and value
    const isAdminFlag = req.user.is_admin;
    console.log(`Admin check for user ${req.user.email}:`);
    console.log(`- is_admin value: ${isAdminFlag}`);
    console.log(`- is_admin type: ${typeof isAdminFlag}`);
    console.log(`- Full user object:`, req.user);
    // Check different potential values to catch edge cases
    const isAdminBoolean = Boolean(isAdminFlag);
    const isAdminString = String(isAdminFlag).toLowerCase();
    console.log(`- is_admin as boolean: ${isAdminBoolean}`);
    console.log(`- is_admin as string: ${isAdminString}`);
    if (!isAdminFlag) {
        console.error(`Access denied: User ${req.user.email} is not an admin`);
        res.status(403).json({ message: 'Access denied, admin rights required' });
        return;
    }
    // User is admin, proceed
    console.log(`Admin access granted for ${req.user.email}`);
    next();
};
exports.isAdmin = isAdmin;
