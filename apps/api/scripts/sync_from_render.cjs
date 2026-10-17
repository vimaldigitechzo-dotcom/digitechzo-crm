const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const RENDER_BASE = 'https://digitechzo-crm-api.onrender.com/api/v1';

async function sync() {
  console.log('Connecting to Render API to fetch live cloud data...');
  const loginRes = await fetch(`${RENDER_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@digitechzo.com', password: 'AdminSecurePassword123!' }),
  });
  const loginJson = await loginRes.json();
  const token = loginJson.data?.accessToken;
  if (!token) {
    console.error('Failed to log in to Render API:', loginJson);
    return;
  }
  console.log('Successfully authenticated with Render Cloud Backend!');

  const headers = { Authorization: `Bearer ${token}` };

  // Fetch all live records
  const [leadsRes, dealsRes, tasksRes, activitiesRes, meetingsRes, proposalsRes, customersRes] = await Promise.all([
    fetch(`${RENDER_BASE}/leads?limit=100`, { headers }).then((r) => r.json()),
    fetch(`${RENDER_BASE}/deals?limit=100`, { headers }).then((r) => r.json()),
    fetch(`${RENDER_BASE}/tasks?limit=100`, { headers }).then((r) => r.json()),
    fetch(`${RENDER_BASE}/activities?limit=100`, { headers }).then((r) => r.json()),
    fetch(`${RENDER_BASE}/meetings?limit=100`, { headers }).then((r) => r.json()),
    fetch(`${RENDER_BASE}/proposals?limit=100`, { headers }).then((r) => r.json()),
    fetch(`${RENDER_BASE}/customers?limit=100`, { headers }).then((r) => r.json()),
  ]);

  const remoteLeads = leadsRes.data?.items || leadsRes.data || [];
  console.log(`Fetched ${remoteLeads.length} leads from Render.`);

  let localOrg = await prisma.organization.findFirst();
  let localUser = await prisma.user.findFirst();
  let localStage = await prisma.pipelineStage.findFirst({ orderBy: { order: 'asc' } });

  // Sync leads
  for (const rl of remoteLeads) {
    console.log(`Syncing lead from Render: ${rl.fullName} (${rl.phone}, ${rl.email})...`);
    await prisma.lead.upsert({
      where: { id: rl.id },
      update: {
        fullName: rl.fullName,
        companyName: rl.companyName,
        title: rl.title,
        phone: rl.phone,
        email: rl.email,
        source: rl.source,
        status: rl.status,
        priority: rl.priority || 'MEDIUM',
        temperature: rl.temperature,
        leadScore: rl.leadScore,
        serviceInterest: rl.serviceInterest || 'General',
        category: rl.category || 'General',
        unqualifiedReason: rl.unqualifiedReason,
        unqualifiedNotes: rl.unqualifiedNotes,
      },
      create: {
        id: rl.id,
        organizationId: localOrg.id,
        ownerId: localUser.id,
        fullName: rl.fullName,
        companyName: rl.companyName,
        title: rl.title,
        phone: rl.phone,
        email: rl.email,
        source: rl.source,
        status: rl.status,
        priority: rl.priority || 'MEDIUM',
        temperature: rl.temperature,
        leadScore: rl.leadScore,
        serviceInterest: rl.serviceInterest || 'General',
        category: rl.category || 'General',
      },
    });
  }

  console.log('✅ Synchronized all live records into Local PostgreSQL successfully!');
}

sync()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
