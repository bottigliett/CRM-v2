import { Request, Response } from 'express';
import prisma from '../config/database';

/**
 * GET /api/user-preferences/:pageName
 * Get user preferences for a specific page
 */
export const getUserPreferences = async (req: Request, res: Response) => {
  try {
    const { pageName } = req.params;
    const userId = (req as any).user?.userId || 1;

    const preferences = await prisma.userPagePreference.findUnique({
      where: {
        userId_pageName: {
          userId,
          pageName,
        },
      },
    });

    res.json({
      success: true,
      data: preferences || null,
    });
  } catch (error: any) {
    console.error('[getUserPreferences] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Errore nel recupero delle preferenze',
    });
  }
};

/**
 * PUT /api/user-preferences/:pageName
 * Save or update user preferences for a specific page
 */
export const saveUserPreferences = async (req: Request, res: Response) => {
  try {
    const { pageName } = req.params;
    const userId = (req as any).user?.userId || 1;
    const { viewMode, pageLimit, typeFilter, columnOrder, columnVisibility } = req.body;

    const columnOrderStr = columnOrder ? JSON.stringify(columnOrder) : undefined;
    const columnVisibilityStr = columnVisibility ? JSON.stringify(columnVisibility) : undefined;

    const preferences = await prisma.userPagePreference.upsert({
      where: {
        userId_pageName: {
          userId,
          pageName,
        },
      },
      create: {
        userId,
        pageName,
        viewMode,
        pageLimit,
        typeFilter,
        columnOrder: columnOrderStr,
        columnVisibility: columnVisibilityStr,
      },
      update: {
        ...(viewMode !== undefined && { viewMode }),
        ...(pageLimit !== undefined && { pageLimit }),
        ...(typeFilter !== undefined && { typeFilter }),
        ...(columnOrderStr !== undefined && { columnOrder: columnOrderStr }),
        ...(columnVisibilityStr !== undefined && { columnVisibility: columnVisibilityStr }),
      },
    });

    res.json({
      success: true,
      data: preferences,
    });
  } catch (error: any) {
    console.error('[saveUserPreferences] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Errore nel salvataggio delle preferenze',
    });
  }
};
