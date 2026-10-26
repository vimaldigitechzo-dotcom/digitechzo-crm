/**
 * DigiTechzo CRM - Clean Reset Script
 * Resets user-generated business data while preserving:
 * - Admin and Staff user accounts
 * - Organization settings
 * - Roles & Permissions
 * - Pipeline stages & Lost reasons
 * 
 * Target: Cloud API (Render) and Local PostgreSQL
 */
const { PrismaClient } = require('../apps/api/node_modules/@prisma/client');

const RENDER_BASE = 'https://digitechzo-crm-api.onrender.com/api/v1';
const ADMIN_EMAIL = 'admin@digitechzo.com';
const ADMIN_PASSWORD = 'AdminSecurePassword123!';

async function resetCloud() {
  console.log('\n=== [Step 1/2] Resetting Cloud API Business Records ===');
  const loginRes = await fetch(`${RENDER_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const loginJson = await loginRes.json();
  const token = loginJson.data?.accessToken;
  if (!token) throw new Error('Cloud login failed: ' + JSON.stringify(loginJson));
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Helper for deleting an array of items by ID
  async function deleteItems(endpoint, label) {
    try {
      const res = await fetch(`${RENDER_BASE}/${endpoint}`, { headers });
      const json = await res.json();
      const items = json.data?.data || json.data?.items || (Array.isArray(json.data) ? json.data : json.items) || [];
      console.log(`Found ${items.length} ${label} to delete in cloud.`);
      for (const item of items) {
        try {
          const delRes = await fetch(`${RENDER_BASE}/${endpoint}/${item.id}`, {
            method: 'DELETE',
            headers,
          });
          if (delRes.ok) {
            console.log(`  ✓ Deleted ${label} ${item.id}`);
          } else {
            console.warn(`  ! Failed to delete ${label} ${item.id}: status ${delRes.status}`);
          }
        } catch (err) {
          console.warn(`  ! Error deleting ${label} ${item.id}: ${err.message}`);
        }
      }
    } catch (err) {
      console.warn(`  ! Could not process ${label}: ${err.message}`);
    }
  }

  // Delete in dependency order: Invoices -> Proposals -> Meetings -> Tasks -> Deals -> Customers -> Leads
  await deleteItems('invoices', 'invoice');
  await deleteItems('proposals', 'proposal');
  await deleteItems('meetings', 'meeting');
  await deleteItems('tasks', 'task');
  await deleteItems('deals', 'deal');
  await deleteItems('customers', 'customer');
  await deleteItems('leads', 'lead');
}

async function resetLocal() {
  console.log('\n=== [Step 2/2] Resetting Local PostgreSQL Business Records ===');
  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL || 'postgresql://postgres:VimalKK4186@localhost:5432/digitechzo_crm?schema=public' } }
  });

  try {
    // Delete transactional business records in foreign-key safe order
    const delInvItems = await prisma.invoiceItem.deleteMany({});
    const delInvoices = await prisma.invoice.deleteMany({});
    const delPropItems = await prisma.proposalItem.deleteMany({});
    const delProposals = await prisma.proposal.deleteMany({});
    const delMeetings = await prisma.meeting.deleteMany({});
    const delActivities = await prisma.activity.deleteMany({});
    const delTasks = await prisma.task.deleteMany({});
    const delDeals = await prisma.deal.deleteMany({});
    const delCustomers = await prisma.customer.deleteMany({});
    const delLeadQual = await prisma.leadQualification.deleteMany({});
    const delLeads = await prisma.lead.deleteMany({});

    console.log(`  ✓ Invoice items deleted: ${delInvItems.count}`);
    console.log(`  ✓ Invoices deleted: ${delInvoices.count}`);
    console.log(`  ✓ Proposal items deleted: ${delPropItems.count}`);
    console.log(`  ✓ Proposals deleted: ${delProposals.count}`);
    console.log(`  ✓ Meetings deleted: ${delMeetings.count}`);
    console.log(`  ✓ Activities deleted: ${delActivities.count}`);
    console.log(`  ✓ Tasks deleted: ${delTasks.count}`);
    console.log(`  ✓ Deals deleted: ${delDeals.count}`);
    console.log(`  ✓ Customers deleted: ${delCustomers.count}`);
    console.log(`  ✓ Lead qualifications deleted: ${delLeadQual.count}`);
    console.log(`  ✓ Leads deleted: ${delLeads.count}`);

    // Verify preservation
    const userCount = await prisma.user.count();
    const roleCount = await prisma.role.count();
    const permCount = await prisma.permission.count();
    const stageCount = await prisma.pipelineStage.count();
    const orgCount = await prisma.organization.count();

    console.log('\n=== PRESERVED SYSTEM FOUNDATION ===');
    console.log(`  - Users preserved: ${userCount}`);
    console.log(`  - Roles preserved: ${roleCount}`);
    console.log(`  - Permissions preserved: ${permCount}`);
    console.log(`  - Pipeline stages preserved: ${stageCount}`);
    console.log(`  - Organizations preserved: ${orgCount}`);
  } catch (err) {
    console.error('Local reset error:', err);
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await resetCloud();
  await resetLocal();
  console.log('\n✅ CRM Reset Complete! Fresh state achieved.');
}

if (process.argv.includes('--execute')) {
  main().catch((err) => {
    console.error('Execution error:', err);
    process.exit(1);
  });
} else {
  console.log('Script loaded in dry-run mode. Run with --execute after user approval.');
}
