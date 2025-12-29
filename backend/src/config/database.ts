import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';

// Use LibSQL adapter for SQLite in development
const libsql = createClient({
  url: process.env.DATABASE_URL || 'file:./prisma/dev.db'
});

const adapter = new PrismaLibSql(libsql);

const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma;
