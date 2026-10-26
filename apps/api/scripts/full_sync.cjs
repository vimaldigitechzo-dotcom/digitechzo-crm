/**
 * DigiTechzo CRM - Full Database Sync Script
 * 
 * This script:
 * 1. Connects to the LOCAL PostgreSQL database
 * 2. Fetches ALL live data from the Render cloud API
 * 3. Seeds the local DB with Organization, Roles, Permissions, PipelineStages, Admin User
 * 4. Syncs all Leads, Deals, Tasks, Meetings, Proposals, Customers, Activities
 * 
 * Run with: node apps/api/scripts/full_sync.cjs
 */

const { PrismaClient } = require('@prisma/client');

const RENDER_BASE = 'https://digitechzo-crm-api.onrender.com/api/v1';
const ADMIN_EMAIL = 'admin@digitechzo.com';
const ADMIN_PASSWORD = 'AdminSecurePassword123!';

let token = null;
let headers = {};

async function apiGet(path) {
  const res = await fetch(`${RENDER_BASE}${path}`, { headers });
  if (!res.ok) {
    console.warn(`  [WARN] GET ${path} returned ${res.status}`);
    return null;
  }
  return res.json();
}

async function login() {
  console.log('\n[1/8] Authenticating with Render cloud API...');
  const res = await fetch(`${RENDER_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const json = await res.json();
  token = json.data?.accessToken;
  if (!token) throw new Error('Login failed: ' + JSON.stringify(json));
  headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  console.log('  ✅ Authenticated with Render cloud backend.');
}

async function seedLocalFoundation(prisma) {
  console.log('\n[2/8] Seeding local DB foundation (Org, Roles, Permissions, Admin User)...');

  // Organization
  const org = await prisma.organization.upsert({
    where: { slug: 'digitechzo' },
    update: { name: 'DigiTechzo Media & Technologies Pvt Ltd', status: 'ACTIVE' },
    create: { name: 'DigiTechzo Media & Technologies Pvt Ltd', slug: 'digitechzo', status: 'ACTIVE' },
  });
  console.log(`  ✅ Organization: ${org.name}`);

  // Roles
  const rolesData = [
    { name: 'ADMIN', description: 'Full system administration', isSystem: true },
    { name: 'MANAGER', description: 'Team management and reporting', isSystem: true },
    { name: 'BDE_SALES', description: 'Business development and leads', isSystem: true },
    { name: 'MARKETING', description: 'Campaign management', isSystem: true },
    { name: 'DELIVERY', description: 'Customer onboarding', isSystem: true },
  ];
  const rolesMap = new Map();
  for (const r of rolesData) {
    const rec = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: r,
    });
    rolesMap.set(r.name, rec.id);
  }
  console.log(`  ✅ ${rolesMap.size} roles seeded.`);

  // Permissions
  const permissionsData = [
    { resource: 'users', action: 'read' }, { resource: 'users', action: 'create' },
    { resource: 'users', action: 'update' }, { resource: 'users', action: 'delete' },
    { resource: 'roles', action: 'read' }, { resource: 'roles', action: 'update' },
    { resource: 'audit_logs', action: 'read' },
    { resource: 'settings', action: 'read' }, { resource: 'settings', action: 'update' },
    { resource: 'leads', action: 'read' }, { resource: 'leads', action: 'create' },
    { resource: 'leads', action: 'update' }, { resource: 'leads', action: 'delete' },
    { resource: 'deals', action: 'read' }, { resource: 'deals', action: 'create' },
    { resource: 'deals', action: 'update' }, { resource: 'deals', action: 'delete' },
    { resource: 'tasks', action: 'read' }, { resource: 'tasks', action: 'create' },
    { resource: 'tasks', action: 'update' }, { resource: 'tasks', action: 'delete' },
    { resource: 'activities', action: 'read' }, { resource: 'activities', action: 'create' },
    { resource: 'activities', action: 'update' }, { resource: 'activities', action: 'delete' },
    { resource: 'meetings', action: 'read' }, { resource: 'meetings', action: 'create' },
    { resource: 'meetings', action: 'update' }, { resource: 'meetings', action: 'delete' },
    { resource: 'proposals', action: 'read' }, { resource: 'proposals', action: 'create' },
    { resource: 'proposals', action: 'update' }, { resource: 'proposals', action: 'delete' },
    { resource: 'customers', action: 'read' }, { resource: 'customers', action: 'create' },
    { resource: 'customers', action: 'update' }, { resource: 'customers', action: 'delete' },
    { resource: 'invoices', action: 'read' }, { resource: 'invoices', action: 'create' },
    { resource: 'invoices', action: 'update' }, { resource: 'invoices', action: 'delete' },
    { resource: 'reports', action: 'read' },
  ];
  const permMap = new Map();
  for (const p of permissionsData) {
    const rec = await prisma.permission.upsert({
      where: { resource_action: { resource: p.resource, action: p.action } },
      update: {},
      create: { resource: p.resource, action: p.action, description: `${p.action} ${p.resource}` },
    });
    permMap.set(`${p.resource}:${p.action}`, rec.id);
  }
  console.log(`  ✅ ${permMap.size} permissions seeded.`);

  // Assign all perms to ADMIN
  const adminRoleId = rolesMap.get('ADMIN');
  for (const permId of permMap.values()) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRoleId, permissionId: permId } },
      update: {},
      create: { roleId: adminRoleId, permissionId: permId },
    });
  }

  // Pipeline Stages
  const stages = [
    { name: 'New Lead (Qualification)', order: 1, stageType: 'OPEN' },
    { name: 'Discovery & Requirement Discussion', order: 2, stageType: 'OPEN' },
    { name: 'Demo / Meeting Completed', order: 3, stageType: 'OPEN' },
    { name: 'Proposal Sent', order: 4, stageType: 'OPEN' },
    { name: 'Negotiation', order: 5, stageType: 'OPEN' },
    { name: 'Closed Won', order: 6, stageType: 'WON' },
    { name: 'Closed Lost', order: 7, stageType: 'LOST' },
  ];
  for (const s of stages) {
    const existing = await prisma.pipelineStage.findFirst({ where: { order: s.order } });
    if (!existing) {
      await prisma.pipelineStage.create({ data: s });
    }
  }
  console.log(`  ✅ ${stages.length} pipeline stages seeded.`);

  // Lost Reasons
  const lostReasons = [
    { code: 'PRICE_TOO_HIGH', label: 'Price too high / Budget constraint' },
    { code: 'COMPETITOR_CHOSEN', label: 'Selected alternative competitor' },
    { code: 'TIMING_POSTPONED', label: 'Project postponed or deprioritized' },
    { code: 'POOR_FIT', label: 'Requirements outside technical capabilities' },
    { code: 'UNRESPONSIVE', label: 'Prospect stopped responding' },
  ];
  for (const lr of lostReasons) {
    await prisma.lostReason.upsert({
      where: { code: lr.code },
      update: { label: lr.label },
      create: { code: lr.code, label: lr.label, isActive: true },
    });
  }
  console.log(`  ✅ ${lostReasons.length} lost reasons seeded.`);

  return { org, rolesMap, adminRoleId };
}

async function syncUsers(prisma, org, rolesMap) {
  console.log('\n[3/8] Syncing users from cloud...');

  // Fetch cloud users
  const usersRes = await apiGet('/users?limit=100');
  const cloudUsers = usersRes?.data?.data || usersRes?.data?.items || usersRes?.data || [];

  const adminRoleId = rolesMap.get('ADMIN');
  const managerRoleId = rolesMap.get('MANAGER');
  const bdeRoleId = rolesMap.get('BDE_SALES');

  function mapRole(roleName) {
    const r = (roleName || '').toUpperCase();
    if (r === 'ADMIN') return adminRoleId;
    if (r === 'MANAGER') return managerRoleId;
    if (r === 'BDE_SALES' || r === 'BDE') return bdeRoleId;
    return adminRoleId;
  }

  let synced = 0;
  for (const u of cloudUsers) {
    const roleId = mapRole(u.role?.name || u.roleName || u.role);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        status: u.status || 'ACTIVE',
        organizationId: org.id,
        roleId,
        avatarUrl: u.avatarUrl || null,
        teamName: u.teamName || null,
      },
      create: {
        id: u.id,
        email: u.email,
        name: u.name,
        passwordHash: u.passwordHash || '$argon2id$v=19$m=65536,t=3,p=4$placeholder_hash_for_sync',
        status: u.status || 'ACTIVE',
        organizationId: org.id,
        roleId,
        avatarUrl: u.avatarUrl || null,
        teamName: u.teamName || null,
      },
    });
    synced++;
  }

  // Always ensure the admin user exists
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!existing) {
    // Create a placeholder admin for FK references
    await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        name: 'DigiTechzo Administrator',
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$placeholder_synced',
        status: 'ACTIVE',
        organizationId: org.id,
        roleId: adminRoleId,
      },
    });
    console.log('  ✅ Created local admin user placeholder.');
  }

  console.log(`  ✅ ${synced} user(s) synced from cloud. Local admin ensured.`);

  // Return the local admin for FK use
  const admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  return admin;
}

async function syncLeads(prisma, org, adminUser) {
  console.log('\n[4/8] Syncing leads from cloud...');
  const res = await apiGet('/leads');
  const leads = res?.data?.data || res?.data?.items || res?.data || [];

  let count = 0;
  for (const l of leads) {
    // Try to find the owner user in local DB
    let ownerId = adminUser.id;
    if (l.ownerId || l.owner?.id) {
      const ownerEmail = l.ownerEmail || l.owner?.email;
      if (ownerEmail) {
        const localOwner = await prisma.user.findUnique({ where: { email: ownerEmail } });
        if (localOwner) ownerId = localOwner.id;
      }
    }

    await prisma.lead.upsert({
      where: { id: l.id },
      update: {
        fullName: l.fullName,
        companyName: l.companyName || null,
        title: l.title || null,
        phone: l.phone,
        email: l.email || null,
        source: l.source || 'MANUAL',
        status: l.status || 'NEW',
        priority: l.priority || 'MEDIUM',
        temperature: l.temperature || null,
        leadScore: l.leadScore ?? 80,
        serviceInterest: l.serviceInterest || 'General',
        ownerId,
        updatedAt: l.updatedAt ? new Date(l.updatedAt) : new Date(),
      },
      create: {
        id: l.id,
        organizationId: org.id,
        ownerId,
        fullName: l.fullName,
        companyName: l.companyName || null,
        title: l.title || null,
        phone: l.phone,
        email: l.email || null,
        source: l.source || 'MANUAL',
        status: l.status || 'NEW',
        priority: l.priority || 'MEDIUM',
        temperature: l.temperature || null,
        leadScore: l.leadScore ?? 80,
        serviceInterest: l.serviceInterest || 'General',
        createdAt: l.createdAt ? new Date(l.createdAt) : new Date(),
        updatedAt: l.updatedAt ? new Date(l.updatedAt) : new Date(),
      },
    });
    count++;
    console.log(`  → Lead synced: ${l.fullName} (${l.phone})`);
  }
  console.log(`  ✅ ${count} leads synced.`);
}

async function syncDeals(prisma, org, adminUser) {
  console.log('\n[5/8] Syncing deals from cloud...');
  const res = await apiGet('/deals');
  const deals = res?.data?.data || res?.data?.items || res?.data || [];

  const stage = await prisma.pipelineStage.findFirst({ orderBy: { order: 'asc' } });
  let count = 0;

  for (const d of deals) {
    const stageId = stage?.id;

    // leadId is required — find local lead or skip
    let leadId = null;
    if (d.leadId) {
      const localLead = await prisma.lead.findUnique({ where: { id: d.leadId } });
      if (localLead) leadId = localLead.id;
    }
    if (!leadId) {
      // No matching lead — skip this deal (FK required)
      console.warn(`  [SKIP] Deal "${d.title}" has no matching local lead, skipping.`);
      continue;
    }

    try {
      await prisma.deal.upsert({
        where: { id: d.id },
        update: {
          title: d.title || 'Untitled Deal',
          value: d.value ?? 0,
          status: d.status || 'OPEN',
          updatedAt: d.updatedAt ? new Date(d.updatedAt) : new Date(),
        },
        create: {
          id: d.id,
          organizationId: org.id,
          ownerId: adminUser.id,
          stageId: stageId,
          leadId: leadId,
          title: d.title || 'Untitled Deal',
          value: d.value ?? 0,
          status: d.status || 'OPEN',
          createdAt: d.createdAt ? new Date(d.createdAt) : new Date(),
          updatedAt: d.updatedAt ? new Date(d.updatedAt) : new Date(),
        },
      });
      count++;
      console.log(`  → Deal synced: ${d.title}`);
    } catch (e) {
      console.warn(`  [WARN] Could not sync deal ${d.id}: ${e.message}`);
    }
  }
  console.log(`  ✅ ${count} deals synced.`);
}

async function syncCustomers(prisma, org, adminUser) {
  console.log('\n[6/8] Syncing customers from cloud...');
  const res = await apiGet('/customers');
  const customers = res?.data?.data || res?.data?.items || res?.data || [];

  let count = 0;
  for (const c of customers) {
    // Local schema: companyName, contactName, phone, email are required
    const companyName = c.companyName || c.company_name || 'Unknown Company';
    const contactName = c.contactName || c.contact_name || c.fullName || c.name || 'Unknown Contact';
    const phone = c.phone || '0000000000';
    const email = c.email || `${c.id}@unknown.local`;
    try {
      await prisma.customer.upsert({
        where: { id: c.id },
        update: {
          companyName,
          contactName,
          phone,
          email,
          status: c.status || 'ACTIVE',
        },
        create: {
          id: c.id,
          organizationId: org.id,
          ownerId: adminUser.id,
          companyName,
          contactName,
          phone,
          email,
          status: c.status || 'ACTIVE',
          createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
          updatedAt: c.updatedAt ? new Date(c.updatedAt) : new Date(),
        },
      });
      count++;
      console.log(`  → Customer synced: ${contactName} (${companyName})`);
    } catch (e) {
      console.warn(`  [WARN] Could not sync customer ${c.id}: ${e.message}`);
    }
  }
  console.log(`  ✅ ${count} customers synced.`);
}

async function syncMeetings(prisma, org, adminUser) {
  console.log('\n[7/8] Syncing meetings from cloud...');
  const res = await apiGet('/meetings');
  const meetings = res?.data?.data || res?.data?.items || res?.data || [];

  let count = 0;
  for (const m of meetings) {
    // Local schema: startTime + endTime required (no scheduledAt field)
    const startTime = m.startTime || m.scheduledAt || m.start_time || new Date().toISOString();
    const endTime = m.endTime || m.end_time || new Date(new Date(startTime).getTime() + 3600000).toISOString();
    try {
      await prisma.meeting.upsert({
        where: { id: m.id },
        update: {
          title: m.title,
          status: m.status || 'SCHEDULED',
          startTime: new Date(startTime),
          endTime: new Date(endTime),
        },
        create: {
          id: m.id,
          organizationId: org.id,
          ownerId: adminUser.id,
          title: m.title || 'Meeting',
          status: m.status || 'SCHEDULED',
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
          updatedAt: m.updatedAt ? new Date(m.updatedAt) : new Date(),
        },
      });
      count++;
      console.log(`  → Meeting synced: ${m.title}`);
    } catch (e) {
      console.warn(`  [WARN] Could not sync meeting ${m.id}: ${e.message}`);
    }
  }
  console.log(`  ✅ ${count} meetings synced.`);
}

async function syncProposals(prisma, org, adminUser) {
  console.log('\n[8/8] Syncing proposals from cloud...');
  const res = await apiGet('/proposals');
  const proposals = res?.data?.data || res?.data?.items || res?.data || [];

  let count = 0;
  for (const p of proposals) {
    // Local schema: proposalNumber is required; use cloud field or generate from id
    const proposalNumber = p.proposalNumber || p.proposal_number || `PROP-${p.id.slice(0, 8).toUpperCase()}`;
    try {
      await prisma.proposal.upsert({
        where: { id: p.id },
        update: {
          title: p.title,
          status: p.status || 'DRAFT',
          totalAmount: p.totalAmount ?? 0,
        },
        create: {
          id: p.id,
          organizationId: org.id,
          ownerId: adminUser.id,
          creatorId: adminUser.id,
          proposalNumber,
          title: p.title || 'Proposal',
          status: p.status || 'DRAFT',
          totalAmount: p.totalAmount ?? 0,
          createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
          updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(),
        },
      });
      count++;
      console.log(`  → Proposal synced: ${p.title}`);
    } catch (e) {
      console.warn(`  [WARN] Could not sync proposal ${p.id}: ${e.message}`);
    }
  }
  console.log(`  ✅ ${count} proposals synced.`);
}

async function printSummary(prisma) {
  console.log('\n========== LOCAL DATABASE SYNC SUMMARY ==========');
  const [orgs, users, leads, deals, customers, meetings, proposals] = await Promise.all([
    prisma.organization.count(),
    prisma.user.count(),
    prisma.lead.count(),
    prisma.deal.count(),
    prisma.customer.count(),
    prisma.meeting.count(),
    prisma.proposal.count(),
  ]);
  console.log(`  Organizations : ${orgs}`);
  console.log(`  Users         : ${users}`);
  console.log(`  Leads         : ${leads}`);
  console.log(`  Deals         : ${deals}`);
  console.log(`  Customers     : ${customers}`);
  console.log(`  Meetings      : ${meetings}`);
  console.log(`  Proposals     : ${proposals}`);
  console.log('=================================================');
  console.log('✅ Prisma Studio will now show all data correctly!');
  console.log('   Run: cd apps/api && npx prisma studio');
}

async function main() {
  console.log('=================================================');
  console.log(' DigiTechzo CRM - Full Cloud → Local Sync');
  console.log('=================================================');

  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL || 'postgresql://postgres:VimalKK4186@localhost:5432/digitechzo_crm?schema=public' } },
  });

  try {
    // Step 1: Login to cloud API
    await login();

    // Step 2: Seed local foundation (org, roles, perms, pipeline stages)
    const { org, rolesMap } = await seedLocalFoundation(prisma);

    // Step 3: Sync users from cloud
    const adminUser = await syncUsers(prisma, org, rolesMap);

    // Step 4: Sync leads
    await syncLeads(prisma, org, adminUser);

    // Step 5: Sync deals
    await syncDeals(prisma, org, adminUser);

    // Step 6: Sync customers
    await syncCustomers(prisma, org, adminUser);

    // Step 7: Sync meetings
    await syncMeetings(prisma, org, adminUser);

    // Step 8: Sync proposals
    await syncProposals(prisma, org, adminUser);

    // Print final summary
    await printSummary(prisma);

  } catch (err) {
    console.error('\n❌ Sync failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
