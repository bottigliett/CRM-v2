import prisma from '../config/database';

const categories = [
  { name: 'Eventi', color: '#3b82f6' },
  { name: 'Da fare', color: '#ef4444' },
  { name: 'Opportunità', color: '#10b981' },
  { name: 'Data fine supporto', color: '#f59e0b' },
  { name: 'Compleanno', color: '#ec4899' },
  { name: 'Fatture', color: '#8b5cf6' },
  { name: 'Progetti', color: '#06b6d4' },
  { name: 'Project Task', color: '#f97316' },
];

async function seedAgendaCategories() {
  console.log('🌱 Seeding agenda categories...');

  try {
    // Delete existing categories
    await prisma.eventCategory.deleteMany({});
    console.log('✅ Deleted existing categories');

    // Create new categories
    for (const category of categories) {
      await prisma.eventCategory.create({
        data: {
          name: category.name,
          color: category.color,
          isActive: true,
        },
      });
      console.log(`✅ Created category: ${category.name}`);
    }

    console.log('🎉 Agenda categories seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding agenda categories:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedAgendaCategories();
