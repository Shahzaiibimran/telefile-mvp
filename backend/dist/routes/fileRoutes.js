"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fileController = __importStar(require("../controllers/fileController"));
const auth_1 = require("../middleware/auth");
const multer_1 = __importDefault(require("../config/multer"));
const router = express_1.default.Router();
// Protected routes (require authentication)
router.post('/initialize', auth_1.authenticate, fileController.initializeUpload);
router.post('/get-chunk-upload-url', auth_1.authenticate, fileController.getChunkUploadUrl);
router.post('/confirm-chunk-upload', auth_1.authenticate, fileController.confirmChunkUpload);
router.post('/upload-chunk', auth_1.authenticate, multer_1.default.single('chunk'), fileController.uploadChunk);
router.post('/complete-upload', auth_1.authenticate, fileController.completeUpload);
router.post('/cancel-upload', auth_1.authenticate, fileController.cancelUpload);
router.get('/user-files', auth_1.authenticate, fileController.getUserFiles);
router.delete('/:fileId', auth_1.authenticate, fileController.deleteFile);
// Public routes
router.get('/download/:shareLink', fileController.getFileDownload);
router.post('/increment-download', fileController.incrementDownloadCount);
// Debug routes - only enable in development
if (process.env.NODE_ENV === 'development') {
    router.get('/debug/:fileId', fileController.debugFileStatus);
}
exports.default = router;
