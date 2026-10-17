const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const leads = await prisma.lead.findMany();
  console.log(`TOTAL LEADS IN POSTGRESQL: ${leads.length}`);
  for (const l of leads) {
    console.log(`- ID: ${l.id} | Name: ${l.fullName} | Phone: ${l.phone} | Email: ${l.email} | Company: ${l.companyName} | OrgId: ${l.organizationId}`);
  }

  const orgs = await prisma.organization.findMany();
  console.log(`TOTAL ORGS: ${orgs.length}`);
  for (const o of orgs) {
    console.log(`- Org ID: ${o.id} | Name: ${o.name}`);
  }

  const users = await prisma.user.findMany();
  console.log(`TOTAL USERS: ${users.length}`);
  for (const u of users) {
    console.log(`- User ID: ${u.id} | Name: ${u.name} | Email: ${u.email} | OrgId: ${u.organizationId}`);
  }
}

main().finally(() => prisma.$disconnect());
