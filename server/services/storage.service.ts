// Storage service for NexaCare Medical System
// Supports AWS S3 and Cloudinary integration with fallback to local/mock storage

export interface UploadFileData {
  file: Buffer;
  filename: string;
  mimetype: string;
  size: number;
  folder?: string; // Optional folder path (e.g., 'lab-reports', 'prescriptions', 'profile-photos')
}

export interface UploadResult {
  url: string;
  key: string; // Storage key/path
  publicId?: string; // Cloudinary public ID
  size: number;
  mimetype: string;
  uploadedAt: Date;
}

interface StorageConfig {
  provider: 's3' | 'cloudinary' | 'local';
  s3Bucket?: string;
  s3Region?: string;
  s3AccessKeyId?: string;
  s3SecretAccessKey?: string;
  cloudinaryCloudName?: string;
  cloudinaryApiKey?: string;
  cloudinaryApiSecret?: string;
  localStoragePath?: string; // For local file storage
}

export class StorageService {
  private static instance: StorageService;
  private config: StorageConfig;
  private mockFiles: Map<string, { data: Buffer; metadata: any }> = new Map();

  constructor() {
    // Load configuration from environment variables
    this.config = {
      provider: (process.env.STORAGE_PROVIDER as 's3' | 'cloudinary' | 'local') || 'local',
      s3Bucket: process.env.AWS_S3_BUCKET,
      s3Region: process.env.AWS_REGION || 'ap-south-1',
      s3AccessKeyId: process.env.AWS_ACCESS_KEY_ID,
      s3SecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
      cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
      cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
      localStoragePath: process.env.LOCAL_STORAGE_PATH || './uploads',
    };

    // Validate provider config
    if (this.config.provider === 's3') {
      if (!this.config.s3Bucket || !this.config.s3AccessKeyId || !this.config.s3SecretAccessKey) {
        console.warn('⚠️  S3 provider selected but credentials missing. Falling back to local storage.');
        this.config.provider = 'local';
      }
    }
    if (this.config.provider === 'cloudinary') {
      if (!this.config.cloudinaryCloudName || !this.config.cloudinaryApiKey || !this.config.cloudinaryApiSecret) {
        console.warn('⚠️  Cloudinary provider selected but credentials missing. Falling back to local storage.');
        this.config.provider = 'local';
      }
    }
  }

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * Upload a file
   */
  async uploadFile(data: UploadFileData): Promise<UploadResult> {
    if (this.config.provider === 's3') {
      try {
        return await this.uploadToS3(data);
      } catch (error: any) {
        console.error('❌ S3 upload error:', error);
        // Fallback to local
        return this.uploadToLocal(data);
      }
    }

    if (this.config.provider === 'cloudinary') {
      try {
        return await this.uploadToCloudinary(data);
      } catch (error: any) {
        console.error('❌ Cloudinary upload error:', error);
        // Fallback to local
        return this.uploadToLocal(data);
      }
    }

    // Local storage (default)
    return this.uploadToLocal(data);
  }

  /**
   * Upload to AWS S3
   */
  private async uploadToS3(data: UploadFileData): Promise<UploadResult> {
    try {
      // Dynamic import to avoid requiring AWS SDK if not installed
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3').catch(() => {
        throw new Error('AWS SDK not installed. Run: npm install @aws-sdk/client-s3');
      });

      const s3Client = new S3Client({
        region: this.config.s3Region!,
        credentials: {
          accessKeyId: this.config.s3AccessKeyId!,
          secretAccessKey: this.config.s3SecretAccessKey!,
        },
      });

      const key = data.folder ? `${data.folder}/${data.filename}` : data.filename;
      const command = new PutObjectCommand({
        Bucket: this.config.s3Bucket!,
        Key: key,
        Body: data.file,
        ContentType: data.mimetype,
      });

      await s3Client.send(command);

      const url = `https://${this.config.s3Bucket}.s3.${this.config.s3Region}.amazonaws.com/${key}`;

      console.log(`\n📁 File Uploaded to S3:`);
      console.log(`📄 Filename: ${data.filename}`);
      console.log(`🔗 URL: ${url}`);
      console.log(`📊 Size: ${(data.size / 1024).toFixed(2)} KB`);
      console.log(`⏰ Uploaded: ${new Date().toLocaleString()}\n`);

      return {
        url,
        key,
        size: data.size,
        mimetype: data.mimetype,
        uploadedAt: new Date(),
      };
    } catch (error: any) {
      console.error('❌ S3 upload error:', error.message);
      throw error;
    }
  }

  /**
   * Upload to Cloudinary
   */
  private async uploadToCloudinary(data: UploadFileData): Promise<UploadResult> {
    try {
      // Dynamic import to avoid requiring cloudinary package if not installed
      const cloudinary = await import('cloudinary').catch(() => {
        throw new Error('Cloudinary package not installed. Run: npm install cloudinary');
      });

      const v2 = cloudinary.default.v2;
      v2.config({
        cloud_name: this.config.cloudinaryCloudName!,
        api_key: this.config.cloudinaryApiKey!,
        api_secret: this.config.cloudinaryApiSecret!,
      });

      // Convert buffer to base64 data URI for Cloudinary
      const base64Data = data.file.toString('base64');
      const dataUri = `data:${data.mimetype};base64,${base64Data}`;

      const folder = data.folder || 'nexacare';
      const result = await v2.uploader.upload(dataUri, {
        folder,
        public_id: data.filename.replace(/\.[^/.]+$/, ''), // Remove extension
        resource_type: 'auto', // Auto-detect image, video, raw, etc.
      });

      console.log(`\n📁 File Uploaded to Cloudinary:`);
      console.log(`📄 Filename: ${data.filename}`);
      console.log(`🔗 URL: ${result.secure_url}`);
      console.log(`🆔 Public ID: ${result.public_id}`);
      console.log(`📊 Size: ${(data.size / 1024).toFixed(2)} KB`);
      console.log(`⏰ Uploaded: ${new Date().toLocaleString()}\n`);

      return {
        url: result.secure_url,
        key: result.public_id,
        publicId: result.public_id,
        size: data.size,
        mimetype: data.mimetype,
        uploadedAt: new Date(),
      };
    } catch (error: any) {
      console.error('❌ Cloudinary upload error:', error.message);
      throw error;
    }
  }

  /**
   * Upload to local storage (mock/file system)
   */
  private async uploadToLocal(data: UploadFileData): Promise<UploadResult> {
    // Generate a unique key
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substr(2, 9);
    const key = data.folder 
      ? `${data.folder}/${timestamp}_${randomStr}_${data.filename}`
      : `${timestamp}_${randomStr}_${data.filename}`;

    // Store file in memory (mock) - in production, you'd write to disk
    this.mockFiles.set(key, {
      data: data.file,
      metadata: {
        filename: data.filename,
        mimetype: data.mimetype,
        size: data.size,
        uploadedAt: new Date(),
      },
    });

    // Generate a mock URL (in production, this would be a real file URL)
    const url = `/api/storage/files/${key}`;

    console.log(`\n📁 File Uploaded (Local Storage):`);
    console.log(`📄 Filename: ${data.filename}`);
    console.log(`🔑 Key: ${key}`);
    console.log(`🔗 URL: ${url}`);
    console.log(`📊 Size: ${(data.size / 1024).toFixed(2)} KB`);
    console.log(`⏰ Uploaded: ${new Date().toLocaleString()}\n`);

    return {
      url,
      key,
      size: data.size,
      mimetype: data.mimetype,
      uploadedAt: new Date(),
    };
  }

  /**
   * Get file (for local storage mock)
   */
  async getFile(key: string): Promise<{ data: Buffer; metadata: any } | null> {
    if (this.config.provider === 'local') {
      return this.mockFiles.get(key) || null;
    }
    // For S3/Cloudinary, files are accessed via URL directly
    return null;
  }

  /**
   * Delete file
   */
  async deleteFile(key: string): Promise<boolean> {
    if (this.config.provider === 's3') {
      try {
        return await this.deleteFromS3(key);
      } catch (error: any) {
        console.error('❌ S3 delete error:', error);
        return false;
      }
    }

    if (this.config.provider === 'cloudinary') {
      try {
        return await this.deleteFromCloudinary(key);
      } catch (error: any) {
        console.error('❌ Cloudinary delete error:', error);
        return false;
      }
    }

    // Local storage
    this.mockFiles.delete(key);
    console.log(`🗑️  File deleted: ${key}`);
    return true;
  }

  /**
   * Delete from S3
   */
  private async deleteFromS3(key: string): Promise<boolean> {
    try {
      const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
      const s3Client = new S3Client({
        region: this.config.s3Region!,
        credentials: {
          accessKeyId: this.config.s3AccessKeyId!,
          secretAccessKey: this.config.s3SecretAccessKey!,
        },
      });

      const command = new DeleteObjectCommand({
        Bucket: this.config.s3Bucket!,
        Key: key,
      });

      await s3Client.send(command);
      console.log(`🗑️  File deleted from S3: ${key}`);
      return true;
    } catch (error: any) {
      console.error('❌ S3 delete error:', error.message);
      throw error;
    }
  }

  /**
   * Delete from Cloudinary
   */
  private async deleteFromCloudinary(publicId: string): Promise<boolean> {
    try {
      const cloudinary = await import('cloudinary');
      const v2 = cloudinary.default.v2;
      v2.config({
        cloud_name: this.config.cloudinaryCloudName!,
        api_key: this.config.cloudinaryApiKey!,
        api_secret: this.config.cloudinaryApiSecret!,
      });

      await v2.uploader.destroy(publicId);
      console.log(`🗑️  File deleted from Cloudinary: ${publicId}`);
      return true;
    } catch (error: any) {
      console.error('❌ Cloudinary delete error:', error.message);
      throw error;
    }
  }
}

export const storageService = StorageService.getInstance();
