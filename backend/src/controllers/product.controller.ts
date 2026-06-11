import { Request, Response } from 'express';
import prisma from '../config/database';

// Get all products
export const getProducts = async (req: Request, res: Response) => {
  try {
    const {
      search = '',
      type = '',
      isActive = '',
      page = '1',
      limit = '20',
    } = req.query;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (type) where.type = type as string;
    if (isActive !== '') where.isActive = isActive === 'true';

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const totalCount = await prisma.product.count({ where });

    const products = await prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
      skip,
      take: limitNum,
    });

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(totalCount / limitNum),
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, message: 'Errore nel recupero dei prodotti', error: error.message });
  }
};

// Get single product
export const getProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) },
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Prodotto non trovato' });
    }

    res.json({ success: true, data: product });
  } catch (error: any) {
    console.error('Error fetching product:', error);
    res.status(500).json({ success: false, message: 'Errore nel recupero del prodotto', error: error.message });
  }
};

// Create product
export const createProduct = async (req: Request, res: Response) => {
  try {
    const data = req.body;

    if (!data.name) {
      return res.status(400).json({ success: false, message: 'Il nome è obbligatorio' });
    }
    if (data.unitPrice === undefined || data.unitPrice === null) {
      return res.status(400).json({ success: false, message: 'Il prezzo unitario è obbligatorio' });
    }

    const product = await prisma.product.create({
      data: {
        name: data.name,
        unitPrice: parseFloat(data.unitPrice),
        description: data.description || null,
        icon: data.icon || null,
        type: data.type || 'SERVIZIO',
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });

    res.status(201).json({ success: true, message: 'Prodotto creato con successo', data: product });
  } catch (error: any) {
    console.error('Error creating product:', error);
    res.status(500).json({ success: false, message: 'Errore nella creazione del prodotto', error: error.message });
  }
};

// Update product
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const existing = await prisma.product.findUnique({ where: { id: parseInt(id) } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Prodotto non trovato' });
    }

    const product = await prisma.product.update({
      where: { id: parseInt(id) },
      data: {
        name: data.name,
        unitPrice: data.unitPrice !== undefined ? parseFloat(data.unitPrice) : undefined,
        description: data.description,
        icon: data.icon,
        type: data.type,
        isActive: data.isActive,
      },
    });

    res.json({ success: true, message: 'Prodotto aggiornato con successo', data: product });
  } catch (error: any) {
    console.error('Error updating product:', error);
    res.status(500).json({ success: false, message: "Errore nell'aggiornamento del prodotto", error: error.message });
  }
};

// Delete product
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.product.findUnique({ where: { id: parseInt(id) } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Prodotto non trovato' });
    }

    await prisma.product.delete({ where: { id: parseInt(id) } });

    res.json({ success: true, message: 'Prodotto eliminato con successo' });
  } catch (error: any) {
    console.error('Error deleting product:', error);
    res.status(500).json({ success: false, message: "Errore nell'eliminazione del prodotto", error: error.message });
  }
};
