import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

export const BASE_UPLOADS_DIR = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.resolve(process.cwd(), 'uploads');

export const MEDICAL_CERTIFICATES_UPLOADS_DIR = path.join(BASE_UPLOADS_DIR, 'medical-certificates');
export const ANNOUNCEMENTS_UPLOADS_DIR = path.join(BASE_UPLOADS_DIR, 'announcements');

// Garante que os diretórios existam
[BASE_UPLOADS_DIR, MEDICAL_CERTIFICATES_UPLOADS_DIR, ANNOUNCEMENTS_UPLOADS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Storage para Atestados Médicos
const medicalStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(MEDICAL_CERTIFICATES_UPLOADS_DIR)) {
      fs.mkdirSync(MEDICAL_CERTIFICATES_UPLOADS_DIR, { recursive: true });
    }
    cb(null, MEDICAL_CERTIFICATES_UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    const safeBaseName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 30);
    cb(null, `${safeBaseName || 'atestado'}-${uniqueSuffix}${ext}`);
  },
});

const medicalFileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/pdf',
  ];

  if (allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Formato de arquivo inválido. Apenas imagens (JPG, PNG, WEBP) e documentos PDF são permitidos.'
      )
    );
  }
};

export const uploadMedicalCertificateMiddleware = multer({
  storage: medicalStorage,
  fileFilter: medicalFileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB
  },
});

// Storage para Comunicados (Banners / Capas)
const announcementStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(ANNOUNCEMENTS_UPLOADS_DIR)) {
      fs.mkdirSync(ANNOUNCEMENTS_UPLOADS_DIR, { recursive: true });
    }
    cb(null, ANNOUNCEMENTS_UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    const safeBaseName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 30);
    cb(null, `banner-${safeBaseName || 'comunicado'}-${uniqueSuffix}${ext}`);
  },
});

const imageFileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
  ];

  if (allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Formato de imagem inválido. Apenas imagens (JPG, PNG, WEBP) são permitidas.'
      )
    );
  }
};

export const uploadAnnouncementCoverMiddleware = multer({
  storage: announcementStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB
  },
});
