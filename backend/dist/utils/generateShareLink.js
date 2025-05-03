"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateShareLink = void 0;
const crypto_1 = __importDefault(require("crypto"));
const File_1 = __importDefault(require("../models/File"));
/**
 * Generate a unique share link (10 characters alphanumeric)
 * @returns {Promise<string>} Unique share link
 */
const generateShareLink = async () => {
    let isUnique = false;
    let shareLink = '';
    while (!isUnique) {
        // Generate a random string of 10 characters
        const buffer = crypto_1.default.randomBytes(8);
        shareLink = buffer.toString('base64')
            .replace(/[+/=]/g, '') // Remove non-alphanumeric characters
            .substring(0, 10); // Truncate to 10 characters
        // Check if the link already exists in the database
        const existingFile = await File_1.default.findOne({ share_link: shareLink });
        if (!existingFile) {
            isUnique = true;
        }
    }
    return shareLink;
};
exports.generateShareLink = generateShareLink;
exports.default = exports.generateShareLink;
