require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Setup upload directory
const uploadDir = path.join(__dirname, 'tmp', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

// Create upload middleware
const upload = multer({ storage: storage });

// Create Express app
const app = express();

// Simple UI for testing
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Multer Test</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
        form { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        label, input { display: block; margin-bottom: 10px; }
        button { padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; }
        pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow: auto; }
      </style>
    </head>
    <body>
      <h1>Multer File Upload Test</h1>
      <form action="/upload" method="post" enctype="multipart/form-data">
        <label for="fileId">File ID:</label>
        <input type="text" id="fileId" name="fileId" required>
        <label for="chunkIndex">Chunk Index:</label>
        <input type="number" id="chunkIndex" name="chunkIndex" required>
        <label for="chunk">Upload File:</label>
        <input type="file" id="chunk" name="chunk" required>
        <button type="submit">Upload</button>
      </form>
      <div id="results">
        <h2>Results will appear here</h2>
      </div>
    </body>
    </html>
  `);
});

// File upload endpoint
app.post('/upload', upload.single('chunk'), (req, res) => {
  try {
    console.log('File uploaded successfully');
    console.log('File details:', req.file);
    console.log('Form data:', req.body);
    
    res.json({
      message: 'Upload successful',
      file: req.file,
      body: req.body
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
const PORT = process.env.TEST_PORT || 3001;
app.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`);
}); 