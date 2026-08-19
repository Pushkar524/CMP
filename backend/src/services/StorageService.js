const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const config = require('../config/env');

class StorageService {
  constructor() {
    const isMinio = config.storage.provider === 'minio';

    if (isMinio) {
      this.bucket = config.storage.minio.bucket;
      this.client = new S3Client({
        endpoint: config.storage.minio.endpoint,
        region: config.storage.minio.region,
        credentials: {
          accessKeyId: config.storage.minio.accessKey,
          secretAccessKey: config.storage.minio.secretKey,
        },
        forcePathStyle: true, // Necessary for MinIO
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
  }

  /**
   * Ensures bucket exists; creates it if running locally on MinIO
   */
  async ensureBucketExists() {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch (err) {
      if (config.storage.provider === 'minio') {
        try {
          await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
          console.log(`[StorageService] MinIO bucket '${this.bucket}' created successfully.`);
        } catch (createErr) {
          console.error(`[StorageService] Failed to create MinIO bucket:`, createErr.message);
        }
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
    await this.ensureBucketExists();
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
    });

    await this.client.send(command);
    return { key, bucket: this.bucket };
  }

  /**
   * Retrieves object stream from storage
   * @param {string} key 
   * @returns {Promise<ReadableStream>}
   */
  async getFileStream(key) {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    const response = await this.client.send(command);
    return response.Body;
  }

  /**
   * Generates a pre-signed URL for downloading/viewing a file
   * @param {string} key 
   * @param {number} expiresInSeconds (default 3600 = 1 hour)
   * @returns {Promise<string>}
   */
  async getSignedDownloadUrl(key, expiresInSeconds = 3600) {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  /**
   * Deletes an object from storage
   * @param {string} key 
   * @returns {Promise<void>}
   */
  async deleteFile(key) {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    await this.client.send(command);
  }
}

module.exports = new StorageService();
