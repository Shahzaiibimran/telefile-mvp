import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';
import User, { IUser } from '../models/User';
import '../types/express';

dotenv.config();

// Load environment variables
const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  JWT_SECRET
} = process.env;

// Configure Google Strategy
export const setupPassport = (): void => {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID || '',
        clientSecret: GOOGLE_CLIENT_SECRET || '',
        callbackURL: '/api/auth/google/callback',
        scope: ['profile', 'email']
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Find existing user
          let user = await User.findOne({ google_id: profile.id });

          // If user doesn't exist, create a new user
          if (!user) {
            const email = profile.emails?.[0]?.value;
            const name = profile.displayName || 'User';

            if (!email) {
              return done(new Error('Email not provided by Google'), undefined);
            }

            // Check if a user with the same email already exists
            const existingUser = await User.findOne({ email });

            if (existingUser) {
              // Update existing user with Google ID
              existingUser.google_id = profile.id;
              await existingUser.save();
              user = existingUser;
            } else {
              // Create new user
              user = await User.create({
                email,
                name,
                google_id: profile.id,
                storage_used: 0
              });
            }
          }

          return done(null, user);
        } catch (error) {
          return done(error as Error, undefined);
        }
      }
    )
  );

  // Serialize and deserialize user
  passport.serializeUser((user: any, done) => {
    // Cast to IUser first to access _id property
    const userWithId = user as IUser;
    done(null, userWithId._id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
};

// Authentication config
export const authConfig = {
  jwtSecret: JWT_SECRET || 'default_jwt_secret_key',
  jwtExpiration: '1d',
  googleClientId: GOOGLE_CLIENT_ID,
  googleClientSecret: GOOGLE_CLIENT_SECRET,
}; 