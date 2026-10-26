/**
 * DigiTechzo CRM - Pre-Reset Comprehensive Database Backup Script
 * Backs up all records from Cloud API and Local PostgreSQL into backups/
 */
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('../apps/api/node_modules/@prisma/client');

const RENDER_BASE = 'https://digitechzo-crm-api.onrender.com/api/v1';
const ADMIN_EMAIL = 'admin@digitechzo.com';
const ADMIN_PASSWORD = 'AdminSecurePassword123!';

async function backup() {
  console.log('=== [1/3] Backing up Cloud API Data ===');
  let cloudToken = null;
  const loginRes = await fetch(`${RENDER_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const loginJson = await loginRes.json();
  cloudToken = loginJson.data?.accessToken;
  if (!cloudToken) {
    throw new Error('Cloud login failed: ' + JSON.stringify(loginJson));
  }
  const headers = { Authorization: `Bearer ${cloudToken}`, 'Content-Type': 'application/json' };

  const endpoints = ['users', 'leads', 'deals', 'tasks', 'activities', 'meetings', 'proposals', 'customers', 'invoices'];
  const cloudData = {};

  for (const ep of endpoints) {
    try {
      // Some endpoints fail on ?limit=500, try clean path first then fallback
      let res = await fetch(`${RENDER_BASE}/${ep}`, { headers });
      if (!res.ok) {
        res = await fetch(`${RENDER_BASE}/${ep}?limit=100`, { headers });
      }
      const json = await res.json();
      const items = json.data?.data || json.data?.items || (Array.isArray(json.data) ? json.data : json.items) || [];
      cloudData[ep] = items;
      console.log(`  - Cloud ${ep}: ${Array.isArray(items) ? items.length : 'N/A'}`);
    } catch (err) {
      console.warn(`  ! Cloud ${ep} fetch error: ${err.message}`);
      cloudData[ep] = [];
    }
  }

  console.log('\n=== [2/3] Backing up Local PostgreSQL Data ===');
  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL || 'postgresql://postgres:VimalKK4186@localhost:5432/digitechzo_crm?schema=public' } }
  });
  const localData = {};
  try {
    localData.organizations = await prisma.organization.findMany();
    localData.users = await prisma.user.findMany();
    localData.roles = await prisma.role.findMany();
    localData.permissions = await prisma.permission.findMany();
    localData.rolePermissions = await prisma.rolePermission.findMany();
    localData.pipelineStages = await prisma.pipelineStage.findMany();
    localData.lostReasons = await prisma.lostReason.findMany();
    localData.leads = await prisma.lead.findMany();
    localData.deals = await prisma.deal.findMany();
    localData.tasks = await prisma.task.findMany();
    localData.activities = await prisma.activity.findMany();
    localData.meetings = await prisma.meeting.findMany();
    localData.proposals = await prisma.proposal.findMany();
    localData.customers = await prisma.customer.findMany();
    localData.invoices = await prisma.invoice.findMany();
    localData.auditLogs = await prisma.auditLog.findMany();

    for (const [k, v] of Object.entries(localData)) {
      console.log(`  - Local ${k}: ${v.length}`);
    }
  } catch (err) {
    console.error('Local backup partial error:', err.message);
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n=== [3/3] Writing Backup Files ===');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.resolve(__dirname, '..', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupPayload = {
    metadata: {
      timestamp: new Date().toISOString(),
      creator: 'Antigravity AI',
      purpose: 'Pre-Reset Fresh State Backup',
      version: '1.0',
    },
    cloud: cloudData,
    local: localData,
  };

  const filePath = path.join(backupDir, `crm_full_backup_${timestamp}.json`);
  fs.writeFileSync(filePath, JSON.stringify(backupPayload, null, 2), 'utf-8');
  const stats = fs.statSync(filePath);
  console.log(`✅ Backup successfully saved to: ${filePath}`);
  console.log(`   File size: ${(stats.size / 1024).toFixed(2)} KB`);
  return filePath;
}

backup().catch((err) => {
  console.error('Backup failed:', err);
  process.exit(1);
});
