import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      file?: {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        buffer: Buffer;
        [key: string]: any;
      };
      files?: {
        [fieldname: string]: Array<{
          fieldname: string;
          originalname: string;
          encoding: string;
          mimetype: string;
          size: number;
          buffer: Buffer;
          [key: string]: any;
        }>;
      } | Array<{
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        buffer: Buffer;
        [key: string]: any;
      }>;
    }
  }
}
