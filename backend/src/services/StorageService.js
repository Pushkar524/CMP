const fs = require('fs');
const path = require('path');
const config = require('../config/env');

class StorageService {
  constructor() {
    this.provider = config.storage.provider || 'local';
    this.localStorageDir = path.join(__dirname, '../../uploads');

    // Always ensure local storage directory exists as fallback / local driver
    if (!fs.existsSync(this.localStorageDir)) {
      fs.mkdirSync(this.localStorageDir, { recursive: true });
    }

    if (this.provider === 'minio' || this.provider === 's3') {
      try {
        const { S3Client } = require('@aws-sdk/client-s3');
        if (this.provider === 'minio') {
          this.bucket = config.storage.minio.bucket;
          this.client = new S3Client({
            endpoint: config.storage.minio.endpoint,
            region: config.storage.minio.region,
            credentials: {
              accessKeyId: config.storage.minio.accessKey,
              secretAccessKey: config.storage.minio.secretKey,
            },
            forcePathStyle: true,
          });
        } else {
          this.bucket = config.storage.s3.bucket;
          this.client = new S3Client({
            region: config.storage.s3.region,
            credentials: {
              accessKeyId: config.storage.s3.accessKeyId,
              secretAccessKey: config.storage.s3.secretAccessKey,
            },
          });
        }
      } catch (err) {
        console.warn('[StorageService] Falling back to local filesystem storage:', err.message);
        this.provider = 'local';
      }
    }
  }

  /**
   * Uploads a file buffer to storage
   * @param {Buffer} fileBuffer 
   * @param {string} mimeType 
   * @param {string} key 
   * @returns {Promise<{ key: string, bucket: string }>}
   */
  async uploadFile(fileBuffer, mimeType, key) {
    if (this.provider === 'local') {
      const filePath = path.join(this.localStorageDir, key);
      const fileDir = path.dirname(filePath);
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }
      await fs.promises.writeFile(filePath, fileBuffer);
      return { key, bucket: 'local' };
    }

    try {
      const { PutObjectCommand } = require('@aws-sdk/client-s3');
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: mimeType,
      });
      await this.client.send(command);
      return { key, bucket: this.bucket };
    } catch (err) {
      console.warn(`[StorageService] S3/MinIO upload failed (${err.message}). Storing locally.`);
      const filePath = path.join(this.localStorageDir, key);
      const fileDir = path.dirname(filePath);
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }
      await fs.promises.writeFile(filePath, fileBuffer);
      return { key, bucket: 'local-fallback' };
    }
  }

  /**
   * Retrieves object buffer from storage
   * @param {string} key 
   * @returns {Promise<Buffer>}
   */
  async getFileBuffer(key) {
    const localFilePath = path.join(this.localStorageDir, key);
    if (fs.existsSync(localFilePath)) {
      return await fs.promises.readFile(localFilePath);
    }

    if (this.client) {
      const { GetObjectCommand } = require('@aws-sdk/client-s3');
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      const response = await this.client.send(command);
      const streamToBuffer = (stream) =>
        new Promise((resolve, reject) => {
          const chunks = [];
          stream.on('data', (chunk) => chunks.push(chunk));
          stream.on('error', reject);
          stream.on('end', () => resolve(Buffer.concat(chunks)));
        });
      return await streamToBuffer(response.Body);
    }

    throw new Error(`File with key '${key}' not found.`);
  }

  /**
   * Generates a download or access URL for a file
   * @param {string} key 
   * @param {number} expiresInSeconds 
   * @returns {Promise<string>}
   */
  async getSignedDownloadUrl(key, expiresInSeconds = 3600) {
    if (this.provider === 'local' || !this.client) {
      return `/api/documents/download/${encodeURIComponent(key)}`;
    }

    try {
      const { GetObjectCommand } = require('@aws-sdk/client-s3');
      const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      return await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
    } catch (err) {
      return `/api/documents/download/${encodeURIComponent(key)}`;
    }
  }

  /**
   * Deletes an object from storage
   * @param {string} key 
   * @returns {Promise<void>}
   */
  async deleteFile(key) {
    const localFilePath = path.join(this.localStorageDir, key);
    if (fs.existsSync(localFilePath)) {
      try {
        await fs.promises.unlink(localFilePath);
      } catch (e) {}
    }

    if (this.client) {
      try {
        const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
        const command = new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        });
        await this.client.send(command);
      } catch (e) {}
    }
  }
}

module.exports = new StorageService();
