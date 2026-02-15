// Local file upload service - stores files as base64 in database
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for memory storage (no disk writes)
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      (cb as (err: Error | null, accept?: boolean) => void)(new Error('File type not allowed'), false);
    }
  },
});

// Convert file to base64 for local storage
export const fileToBase64 = (file: Express.Multer.File): string => {
  return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
};

// Extract file info for storage
export const getFileInfo = (file: Express.Multer.File) => {
  return {
    originalName: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    buffer: file.buffer,
    base64: fileToBase64(file),
  };
};

// Validate file size
export const validateFileSize = (file: Express.Multer.File, maxSize: number = 5 * 1024 * 1024): boolean => {
  return file.size <= maxSize;
};

// Generate unique filename
export const generateUniqueFilename = (originalName: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const ext = path.extname(originalName);
  return `${timestamp}_${random}${ext}`;
};

// Demo file upload handler
export const handleFileUpload = (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileInfo = getFileInfo(req.file);
    
    // Log to console for demo
    console.log(`\n📁 [DEMO] File Upload:`);
    console.log(`📄 Name: ${fileInfo.originalName}`);
    console.log(`📊 Size: ${(fileInfo.size / 1024).toFixed(2)} KB`);
    console.log(`🎯 Type: ${fileInfo.mimetype}`);
    console.log(`⏰ Uploaded: ${new Date().toLocaleString()}\n`);

    // Return file info (base64 data for demo)
    res.json({
      success: true,
      file: {
        id: `file_${Date.now()}`,
        name: fileInfo.originalName,
        type: fileInfo.mimetype,
        size: fileInfo.size,
        url: fileInfo.base64, // Base64 data URL
        uploadedAt: new Date().toISOString(),
      },
      message: 'File uploaded successfully (stored locally)',
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
};

