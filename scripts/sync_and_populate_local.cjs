const { PrismaClient } = require('../apps/api/node_modules/@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:VimalKK4186@localhost:5432/digitechzo_crm?schema=public'
    }
  }
});

async function syncAndPopulate() {
  console.log('--- Syncing and populating all leads to Local PostgreSQL ---');

  const admin = await prisma.user.findFirst({ where: { email: 'admin@digitechzo.com' } });
  if (!admin) throw new Error('Admin user not found!');
  const orgId = admin.organizationId;
  const adminId = admin.id;

  // 1. Fetch live cloud leads
  const loginRes = await fetch('https://digitechzo-crm-api.onrender.com/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@digitechzo.com', password: 'AdminSecurePassword123!' })
  });
  const token = (await loginRes.json()).data?.accessToken;
  const cloudRes = await fetch('https://digitechzo-crm-api.onrender.com/api/v1/leads?limit=100', {
    headers: { Authorization: 'Bearer ' + token }
  });
  const cloudLeads = (await cloudRes.json()).data?.items || [];
  console.log('Found', cloudLeads.length, 'leads in cloud.');

  // 2. Also read backup leads
  const b = require('../backups/crm_full_backup_2026-10-26T07-46-55-094Z.json');
  const backupLeads = b.local.leads || [];

  const allLeads = [...cloudLeads, ...backupLeads];
  const seenPhones = new Set();

  for (const l of allLeads) {
    const phone = (l.phone || '').trim();
    if (!phone || seenPhones.has(phone)) continue;
    seenPhones.add(phone);

    await prisma.lead.upsert({
      where: { id: l.id },
      update: {
        organizationId: orgId,
        ownerId: adminId,
        fullName: l.fullName,
        phone: l.phone,
        email: l.email || null,
        companyName: l.companyName || null,
        status: l.status || 'NEW',
        serviceInterest: l.serviceInterest || 'General',
      },
      create: {
        id: l.id,
        organizationId: orgId,
        ownerId: adminId,
        fullName: l.fullName,
        phone: l.phone,
        email: l.email || null,
        companyName: l.companyName || null,
        source: l.source || 'WEBSITE_FORM',
        status: l.status || 'NEW',
        priority: l.priority || 'MEDIUM',
        leadScore: l.leadScore ?? 80,
        serviceInterest: l.serviceInterest || 'General',
      }
    });
    console.log('  ✓ Saved lead:', l.fullName, '(' + l.phone + ')');
  }

  // 3. Populate Customers
  const backupCustomers = b.local.customers || [];
  for (const c of backupCustomers) {
    const leadExists = await prisma.lead.findUnique({ where: { id: c.leadId || '' } });
    await prisma.customer.upsert({
      where: { id: c.id },
      update: { organizationId: orgId, ownerId: adminId },
      create: {
        id: c.id,
        organization: { connect: { id: orgId } },
        owner: { connect: { id: adminId } },
        lead: leadExists ? { connect: { id: leadExists.id } } : undefined,
        companyName: c.companyName || 'Customer Company',
        contactName: c.contactName || 'Customer Contact',
        email: c.email || 'customer@digitechzo.local',
        phone: c.phone || '0000000000',
        status: c.status || 'ACTIVE',
      }
    });
  }

  // 4. Verify Local API call
  console.log('\n--- Testing Local API (http://localhost:4000/api/v1/leads) ---');
  const localLogin = await fetch('http://localhost:4000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@digitechzo.com', password: 'AdminSecurePassword123!' })
  });
  const localToken = (await localLogin.json()).data?.accessToken;
  const localLeads = await fetch('http://localhost:4000/api/v1/leads?limit=100', {
    headers: { Authorization: 'Bearer ' + localToken }
  });
  const localJson = await localLeads.json();
  const items = localJson.data?.items || localJson.data || [];
  console.log('🎉 LOCAL API HTTP STATUS:', localLeads.status);
  console.log('🎉 TOTAL LEADS RETURNED FROM LOCAL DB:', items.length);
  items.forEach(i => console.log('   • ' + i.fullName + ' (' + i.phone + ')'));
}

syncAndPopulate()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
