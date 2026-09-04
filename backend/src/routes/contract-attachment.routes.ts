import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { authenticate } from '../middleware/auth';
import {
  getContractAttachments,
  uploadContractAttachment,
  downloadContractAttachment,
  deleteContractAttachment,
} from '../controllers/contract-attachment.controller';

const UPLOADS_DIR = path.join(__dirname, '../../uploads/contracts');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = path.join(UPLOADS_DIR, req.params.id);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const hash = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${hash}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

const router = express.Router();

router.get('/:id/attachments', authenticate, getContractAttachments);
router.post('/:id/attachments', authenticate, upload.array('files', 10), uploadContractAttachment);
router.get('/attachments/:attachmentId', downloadContractAttachment); // auth via query token if needed
router.delete('/attachments/:attachmentId', authenticate, deleteContractAttachment);

export default router;
