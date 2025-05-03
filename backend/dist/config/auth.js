"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authConfig = exports.setupPassport = void 0;
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const dotenv_1 = __importDefault(require("dotenv"));
const User_1 = __importDefault(require("../models/User"));
dotenv_1.default.config();
// Load environment variables
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, JWT_SECRET } = process.env;
// Configure Google Strategy
const setupPassport = () => {
    passport_1.default.use(new passport_google_oauth20_1.Strategy({
        clientID: GOOGLE_CLIENT_ID || '',
        clientSecret: GOOGLE_CLIENT_SECRET || '',
        callbackURL: '/api/auth/google/callback',
        scope: ['profile', 'email']
    }, async (accessToken, refreshToken, profile, done) => {
        var _a, _b;
        try {
            // Find existing user
            let user = await User_1.default.findOne({ google_id: profile.id });
            // If user doesn't exist, create a new user
            if (!user) {
                const email = (_b = (_a = profile.emails) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.value;
                const name = profile.displayName || 'User';
                if (!email) {
                    return done(new Error('Email not provided by Google'), undefined);
                }
                // Check if a user with the same email already exists
                const existingUser = await User_1.default.findOne({ email });
                if (existingUser) {
                    // Update existing user with Google ID
                    existingUser.google_id = profile.id;
                    await existingUser.save();
                    user = existingUser;
                }
                else {
                    // Create new user
                    user = await User_1.default.create({
                        email,
                        name,
                        google_id: profile.id,
                        storage_used: 0
                    });
                }
            }
            return done(null, user);
        }
        catch (error) {
            return done(error, undefined);
        }
    }));
    // Serialize and deserialize user
    passport_1.default.serializeUser((user, done) => {
        // Cast to IUser first to access _id property
        const userWithId = user;
        done(null, userWithId._id);
    });
    passport_1.default.deserializeUser(async (id, done) => {
        try {
            const user = await User_1.default.findById(id);
            done(null, user);
        }
        catch (error) {
            done(error, null);
        }
    });
};
exports.setupPassport = setupPassport;
// Authentication config
exports.authConfig = {
    jwtSecret: JWT_SECRET || 'default_jwt_secret_key',
    jwtExpiration: '1d',
    googleClientId: GOOGLE_CLIENT_ID,
    googleClientSecret: GOOGLE_CLIENT_SECRET,
};
