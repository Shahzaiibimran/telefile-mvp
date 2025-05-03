"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const passport_1 = __importDefault(require("passport"));
const express_session_1 = __importDefault(require("express-session"));
const database_1 = __importDefault(require("./config/database"));
const auth_1 = require("./config/auth");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const fileRoutes_1 = __importDefault(require("./routes/fileRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
// Load environment variables
dotenv_1.default.config();
// Initialize Express app
const app = (0, express_1.default)();
// Connect to MongoDB
(0, database_1.default)();
// Setup passport authentication
(0, auth_1.setupPassport)();
// Middleware
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
// Increase JSON body size limit
app.use(express_1.default.json({ limit: '50mb' }));
// Increase URL-encoded body size limit
app.use(express_1.default.urlencoded({
    extended: true,
    limit: '50mb'
}));
// Configure file upload middleware with proper limits
// Do NOT add this middleware here - it will be added in fileRoutes
// app.use(fileUpload({
//   limits: { 
//     fileSize: storageConfig.maxFileSize, // Use the same max file size as defined in storage config
//   },
//   abortOnLimit: true,
//   useTempFiles: true,
//   tempFileDir: '/tmp/',
//   debug: process.env.NODE_ENV === 'development'
// }));
// Add express-session middleware
app.use((0, express_session_1.default)({
    secret: process.env.JWT_SECRET || 'default_session_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
}));
// Initialize passport middleware
app.use(passport_1.default.initialize());
app.use(passport_1.default.session());
app.use((err, req, res, next) => {
    console.error(err.stack);
    const statusCode = err.status || 500;
    res.status(statusCode).json({
        message: err.message || 'Internal Server Error',
    });
});
// Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/files', fileRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK' });
});
// Default route
app.get('/', (req, res) => {
    res.send('TeleFile API is running');
});
// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
