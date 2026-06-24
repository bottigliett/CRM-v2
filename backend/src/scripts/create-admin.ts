import prisma from '../config/database';
import bcrypt from 'bcryptjs';

async function createAdmin() {
  try {
    // Check if a SUPER_ADMIN already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' },
    });

    if (existingAdmin) {
      console.log('⚠️  A SUPER_ADMIN already exists:');
      console.log(`   Username: ${existingAdmin.username}`);
      console.log(`   Email: ${existingAdmin.email}`);
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);

    const admin = await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@mismostudio.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'SUPER_ADMIN',
        isActive: true,
        emailVerified: true,
      },
    });

    console.log('✅ SUPER_ADMIN created successfully!');
    console.log(`   Username: ${admin.username}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Password: admin123`);
    console.log('');
    console.log('⚠️  IMPORTANT: Change the password after first login!');
  } catch (error) {
    console.error('❌ Error creating admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
