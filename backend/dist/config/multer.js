"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const storage_1 = require("./storage");
// Create temp upload directory if it doesn't exist
const uploadDir = path_1.default.join(process.cwd(), 'tmp', 'uploads');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
// Configure multer disk storage
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Generate a unique filename using uuid
        const uniqueFilename = `${(0, uuid_1.v4)()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        cb(null, uniqueFilename);
    }
});
// Create multer upload instance
const upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: storage_1.storageConfig.chunkSize * 1.1, // Allow a bit more than our chunk size
    },
    fileFilter: function (req, file, cb) {
        // Accept all file types
        cb(null, true);
    }
});
exports.default = upload;
