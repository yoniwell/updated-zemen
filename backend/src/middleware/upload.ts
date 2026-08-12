import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const ALLOWED_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 
  'application/pdf', 
  'application/msword', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed'
];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.zip'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const execAsync = promisify(exec);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(path.basename(file.originalname)).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const extension = path.extname(path.basename(file.originalname)).toLowerCase();
  const mimeValid = ALLOWED_TYPES.includes(file.mimetype);
  const extensionValid = ALLOWED_EXTENSIONS.includes(extension);

  if (mimeValid || extensionValid) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Accepted: jpg, jpeg, png, pdf, doc, docx, xls, xlsx, csv, zip`));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE },
});

export const uploadUnrestricted = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

export const uploadAnyImage = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed.'));
    }
  },
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

const startsWith = (source: Buffer, signature: number[]): boolean =>
  signature.every((value, index) => source[index] === value);

const isPdfSignature = (source: Buffer): boolean => startsWith(source, [0x25, 0x50, 0x44, 0x46]); // %PDF
const isPngSignature = (source: Buffer): boolean => startsWith(source, [0x89, 0x50, 0x4e, 0x47]); // PNG
const isJpegSignature = (source: Buffer): boolean => startsWith(source, [0xff, 0xd8, 0xff]);
const isWebpSignature = (source: Buffer): boolean =>
  source.length >= 12 &&
  source.subarray(0, 4).toString('ascii') === 'RIFF' &&
  source.subarray(8, 12).toString('ascii') === 'WEBP';

const isHeicSignature = (source: Buffer): boolean => {
  if (source.length < 12) {
    return false;
  }

  const boxType = source.subarray(4, 8).toString('ascii');
  if (boxType !== 'ftyp') {
    return false;
  }

  const brand = source.subarray(8, 12).toString('ascii');
  return ['heic', 'heif', 'mif1', 'msf1'].includes(brand);
};

export async function validateUploadedFileSignature(filePath: string, _mimeType: string): Promise<boolean> {
  const descriptor = await fs.promises.open(filePath, 'r');
  try {
    const sample = Buffer.alloc(12);
    const { bytesRead } = await descriptor.read(sample, 0, sample.length, 0);
    const header = sample.subarray(0, bytesRead);

    return (
      isPdfSignature(header) ||
      isPngSignature(header) ||
      isWebpSignature(header) ||
      isHeicSignature(header) ||
      isJpegSignature(header)
    );
  } finally {
    await descriptor.close();
  }
}

export async function scanUploadedFile(filePath: string): Promise<{ clean: boolean; details?: string }> {
  const scanCommandTemplate = process.env.MALWARE_SCAN_COMMAND;
  if (!scanCommandTemplate) {
    return { clean: true, details: 'malware scan skipped (no MALWARE_SCAN_COMMAND configured)' };
  }

  const replaced = scanCommandTemplate.includes('{{file}}')
    ? scanCommandTemplate.replace(/\{\{file\}\}/g, `"${filePath.replace(/"/g, '\\"')}"`)
    : `${scanCommandTemplate} "${filePath.replace(/"/g, '\\"')}"`;

  try {
    await execAsync(replaced);
    return { clean: true };
  } catch (error) {
    const details = error instanceof Error ? error.message : 'malware scan command failed';
    return { clean: false, details };
  }
}
