import app from './app';
import prisma from './config/database';
import { expireOldQuotes } from './controllers/vt-quote.controller';

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL}`);
    });

    // Cron: expire quotes older than 30 days (runs every hour)
    setInterval(async () => {
      try {
        await expireOldQuotes();
      } catch (err) {
        console.error('Cron expireOldQuotes error:', err);
      }
    }, 60 * 60 * 1000); // every hour
    // Run once at startup
    expireOldQuotes().catch(() => {});
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
