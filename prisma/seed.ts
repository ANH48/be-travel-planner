import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Check if admin exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@travelplanner.com' },
  });

  if (existingAdmin) {
    console.log('✅ Admin account already exists');
    console.log('   Email: admin@travelplanner.com');
    return;
  }

  // Create admin account
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@travelplanner.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
    },
  });

  console.log('✅ Admin account created successfully!');
  console.log('   Email: admin@travelplanner.com');
  console.log('   Password: admin123');
  console.log('   ID:', admin.id);
  console.log('\n⚠️  Please change the password after first login!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
