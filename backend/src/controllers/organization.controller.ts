import { Request, Response } from 'express';
import prisma from '../config/database';

// Get all organizations with filters and pagination
export const getOrganizations = async (req: Request, res: Response) => {
  try {
    const {
      search = '',
      industry = '',
      accountType = '',
      isActive = '',
      page = '1',
      limit = '20',
    } = req.query;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { vatNumber: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { code: { contains: search } },
        { pec: { contains: search } },
      ];
    }

    if (industry) {
      where.industry = industry as string;
    }

    if (accountType) {
      where.accountType = accountType as string;
    }

    if (isActive !== '') {
      where.isActive = isActive === 'true';
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const totalCount = await prisma.organization.count({ where });

    const organizations = await prisma.organization.findMany({
      where,
      include: {
        assignedTo: {
          select: { id: true, username: true, firstName: true, lastName: true },
        },
        parent: {
          select: { id: true, name: true },
        },
      },
      orderBy: { name: 'asc' },
      skip,
      take: limitNum,
    });

    res.json({
      success: true,
      data: {
        organizations,
        pagination: {
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(totalCount / limitNum),
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero delle organizzazioni',
      error: error.message,
    });
  }
};

// Get single organization
export const getOrganization = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const organization = await prisma.organization.findUnique({
      where: { id: parseInt(id) },
      include: {
        assignedTo: {
          select: { id: true, username: true, firstName: true, lastName: true },
        },
        parent: {
          select: { id: true, name: true },
        },
        children: {
          select: { id: true, name: true },
        },
      },
    });

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organizzazione non trovata',
      });
    }

    res.json({ success: true, data: organization });
  } catch (error: any) {
    console.error('Error fetching organization:', error);
    res.status(500).json({
      success: false,
      message: "Errore nel recupero dell'organizzazione",
      error: error.message,
    });
  }
};

// Create organization
export const createOrganization = async (req: Request, res: Response) => {
  try {
    const data = req.body;

    if (!data.name) {
      return res.status(400).json({
        success: false,
        message: 'Il nome è obbligatorio',
      });
    }

    const organization = await prisma.organization.create({
      data: {
        name: data.name,
        vatNumber: data.vatNumber || null,
        uniqueCode: data.uniqueCode || null,
        pec: data.pec || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
        code: data.code || null,
        denomination: data.denomination || null,
        phone: data.phone || null,
        otherPhone: data.otherPhone || null,
        mobile: data.mobile || null,
        fax: data.fax || null,
        email: data.email || null,
        employees: data.employees ? parseInt(data.employees) : null,
        industry: data.industry || null,
        accountType: data.accountType || null,
        devices: data.devices || null,
        parentId: data.parentId ? parseInt(data.parentId) : null,
        nasInfo: data.nasInfo || null,
        shareholders: data.shareholders || null,
        nasContract: data.nasContract || null,
        legalRep: data.legalRep || null,
        secretary: data.secretary || null,
        assignedToId: data.assignedToId ? parseInt(data.assignedToId) : null,
        priceList: data.priceList || null,
        billStreet: data.billStreet || null,
        billCity: data.billCity || null,
        billState: data.billState || null,
        billCode: data.billCode || null,
        billCountry: data.billCountry || null,
        shipStreet: data.shipStreet || null,
        shipCity: data.shipCity || null,
        shipState: data.shipState || null,
        shipCode: data.shipCode || null,
        shipCountry: data.shipCountry || null,
        bankName: data.bankName || null,
        iban: data.iban || null,
        description: data.description || null,
      },
      include: {
        assignedTo: {
          select: { id: true, username: true, firstName: true, lastName: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Organizzazione creata con successo',
      data: organization,
    });
  } catch (error: any) {
    console.error('Error creating organization:', error);
    res.status(500).json({
      success: false,
      message: "Errore nella creazione dell'organizzazione",
      error: error.message,
    });
  }
};

// Update organization
export const updateOrganization = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const existing = await prisma.organization.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Organizzazione non trovata',
      });
    }

    const organization = await prisma.organization.update({
      where: { id: parseInt(id) },
      data: {
        name: data.name,
        vatNumber: data.vatNumber,
        uniqueCode: data.uniqueCode,
        pec: data.pec,
        isActive: data.isActive,
        code: data.code,
        denomination: data.denomination,
        phone: data.phone,
        otherPhone: data.otherPhone,
        mobile: data.mobile,
        fax: data.fax,
        email: data.email,
        employees: data.employees !== undefined && data.employees !== null && data.employees !== '' ? parseInt(data.employees) : null,
        industry: data.industry,
        accountType: data.accountType,
        devices: data.devices,
        parentId: data.parentId ? parseInt(data.parentId) : null,
        nasInfo: data.nasInfo,
        shareholders: data.shareholders,
        nasContract: data.nasContract,
        legalRep: data.legalRep,
        secretary: data.secretary,
        assignedToId: data.assignedToId ? parseInt(data.assignedToId) : null,
        priceList: data.priceList,
        billStreet: data.billStreet,
        billCity: data.billCity,
        billState: data.billState,
        billCode: data.billCode,
        billCountry: data.billCountry,
        shipStreet: data.shipStreet,
        shipCity: data.shipCity,
        shipState: data.shipState,
        shipCode: data.shipCode,
        shipCountry: data.shipCountry,
        bankName: data.bankName,
        iban: data.iban,
        description: data.description,
      },
      include: {
        assignedTo: {
          select: { id: true, username: true, firstName: true, lastName: true },
        },
      },
    });

    res.json({
      success: true,
      message: 'Organizzazione aggiornata con successo',
      data: organization,
    });
  } catch (error: any) {
    console.error('Error updating organization:', error);
    res.status(500).json({
      success: false,
      message: "Errore nell'aggiornamento dell'organizzazione",
      error: error.message,
    });
  }
};

// Delete organization
export const deleteOrganization = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.organization.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Organizzazione non trovata',
      });
    }

    await prisma.organization.delete({
      where: { id: parseInt(id) },
    });

    res.json({
      success: true,
      message: 'Organizzazione eliminata con successo',
    });
  } catch (error: any) {
    console.error('Error deleting organization:', error);
    res.status(500).json({
      success: false,
      message: "Errore nell'eliminazione dell'organizzazione",
      error: error.message,
    });
  }
};
