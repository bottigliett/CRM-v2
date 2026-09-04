import { Request, Response } from 'express';
import prisma from '../config/database';
import path from 'path';
import fs from 'fs/promises';
import { UPLOADS_DIR, deleteFile } from '../utils/file-upload';

const CONTRACTS_UPLOADS_DIR = path.join(UPLOADS_DIR, 'contracts');

async function ensureContractDir(contractId: number): Promise<string> {
  const dir = path.join(CONTRACTS_UPLOADS_DIR, contractId.toString());
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export const getContractAttachments = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const attachments = await prisma.contractAttachment.findMany({
      where: { contractId: parseInt(id) },
      include: { uploadedBy: { select: { id: true, firstName: true, lastName: true, username: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: attachments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const uploadContractAttachment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;
    const files = req.files as Express.Multer.File[];

    if (!files?.length) return res.status(400).json({ success: false, message: 'Nessun file caricato' });

    const contract = await prisma.serviceContract.findUnique({ where: { id: parseInt(id) } });
    if (!contract) {
      await Promise.all(files.map(f => deleteFile(f.path)));
      return res.status(404).json({ success: false, message: 'Contratto non trovato' });
    }

    const attachments = await prisma.$transaction(
      files.map(file => prisma.contractAttachment.create({
        data: {
          contractId: parseInt(id),
          fileName: file.filename,
          originalFileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          storagePath: `contracts/${id}/${file.filename}`,
          uploadedById: userId,
        },
      }))
    );

    res.status(201).json({ success: true, data: attachments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const downloadContractAttachment = async (req: Request, res: Response) => {
  try {
    const { attachmentId } = req.params;

    const attachment = await prisma.contractAttachment.findUnique({
      where: { id: parseInt(attachmentId) },
    });

    if (!attachment) return res.status(404).json({ success: false, message: 'Allegato non trovato' });

    const filePath = path.join(CONTRACTS_UPLOADS_DIR, attachment.storagePath.replace('contracts/', ''));

    try { await fs.access(filePath); } catch {
      return res.status(404).json({ success: false, message: 'File non trovato sul server' });
    }

    res.setHeader('Content-Type', attachment.mimeType);
    const forceDownload = req.query.download === 'true';
    const isViewable = attachment.mimeType === 'application/pdf' || attachment.mimeType.startsWith('image/');
    res.setHeader('Content-Disposition',
      (forceDownload || !isViewable) ? `attachment; filename="${attachment.originalFileName}"` : `inline; filename="${attachment.originalFileName}"`
    );
    res.sendFile(filePath);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteContractAttachment = async (req: Request, res: Response) => {
  try {
    const { attachmentId } = req.params;

    const attachment = await prisma.contractAttachment.findUnique({ where: { id: parseInt(attachmentId) } });
    if (!attachment) return res.status(404).json({ success: false, message: 'Allegato non trovato' });

    const filePath = path.join(CONTRACTS_UPLOADS_DIR, attachment.storagePath.replace('contracts/', ''));
    await deleteFile(filePath);
    await prisma.contractAttachment.delete({ where: { id: parseInt(attachmentId) } });

    res.json({ success: true, message: 'Allegato eliminato' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
