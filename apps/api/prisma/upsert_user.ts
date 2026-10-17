import { PrismaClient } from '@prisma/client';
import * as argon2 from '@node-rs/argon2';

const prisma = new PrismaClient();

async function run() {
  const org = await prisma.organization.findFirst();
  const adminRole = await prisma.role.findFirst({ where: { name: 'ADMIN' } });
  if (!org || !adminRole) {
    console.error('Org or role not found');
    return;
  }
  const passwordHash = await argon2.hash('VimalKK4186@');
  const user = await prisma.user.upsert({
    where: { email: 'vimaldigitechzo@gmail.com' },
    update: {
      passwordHash,
      roleId: adminRole.id,
      status: 'ACTIVE',
    },
    create: {
      name: 'Vimal Tester',
      email: 'vimaldigitechzo@gmail.com',
      passwordHash,
      roleId: adminRole.id,
      organizationId: org.id,
      status: 'ACTIVE',
    },
  });
  console.log('SUCCESS: User upserted:', user.email, user.id);
}

run()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
