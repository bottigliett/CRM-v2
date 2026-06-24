import prisma from '../config/database';

const defaultCategories = [
  { name: 'Eventi', color: '#3b82f6', icon: 'Calendar' },
  { name: 'Da fare', color: '#ef4444', icon: 'CheckCircle' },
  { name: 'Opportunità', color: '#10b981', icon: 'TrendingUp' },
  { name: 'Data fine supporto', color: '#f59e0b', icon: 'AlertCircle' },
  { name: 'Compleanno', color: '#ec4899', icon: 'Cake' },
  { name: 'Fatture', color: '#8b5cf6', icon: 'FileText' },
  { name: 'Progetti', color: '#06b6d4', icon: 'Briefcase' },
  { name: 'Project Task', color: '#f97316', icon: 'ClipboardList' },
];

async function seedEventCategories() {
  try {
    console.log('🌱 Seeding event categories...\n');

    let created = 0;
    let skipped = 0;

    for (const category of defaultCategories) {
      // Check if category already exists
      const existing = await prisma.eventCategory.findUnique({
        where: { name: category.name },
      });

      if (existing) {
        console.log(`⏭️  Skipped "${category.name}" (already exists)`);
        skipped++;
        continue;
      }

      // Create category
      await prisma.eventCategory.create({
        data: category,
      });

      console.log(`✅ Created category "${category.name}"`);
      created++;
    }

    console.log('\n📊 Seed Summary:');
    console.log(`   ✅ Created: ${created}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   📝 Total: ${defaultCategories.length}\n`);

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

seedEventCategories();
