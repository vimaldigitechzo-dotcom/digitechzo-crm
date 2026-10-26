const argon2 = require('../apps/api/node_modules/@node-rs/argon2');
const { PrismaClient } = require('../apps/api/node_modules/@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:VimalKK4186@localhost:5432/digitechzo_crm?schema=public'
    }
  }
});

const ADMIN_EMAIL = 'admin@digitechzo.com';
const ADMIN_PASSWORD = 'AdminSecurePassword123!';

async function setupAdmin() {
  console.log('--- Setting up Admin User and Roles in PostgreSQL ---');

  // 1. Ensure Organization
  const org = await prisma.organization.upsert({
    where: { slug: 'digitechzo' },
    update: { name: 'DigiTechzo Media & Technologies Pvt Ltd', status: 'ACTIVE' },
    create: { name: 'DigiTechzo Media & Technologies Pvt Ltd', slug: 'digitechzo', status: 'ACTIVE' },
  });
  console.log('✓ Organization ensured:', org.id, org.name);

  // 2. Ensure Roles
  const rolesData = [
    { name: 'ADMIN', description: 'Full system administration', isSystem: true },
    { name: 'MANAGER', description: 'Team management and reporting', isSystem: true },
    { name: 'BDE_SALES', description: 'Business development and leads', isSystem: true },
    { name: 'MARKETING', description: 'Campaign management', isSystem: true },
    { name: 'DELIVERY', description: 'Customer onboarding', isSystem: true },
  ];
  let adminRole = null;
  for (const r of rolesData) {
    const rec = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: r,
    });
    if (r.name === 'ADMIN') adminRole = rec;
  }
  console.log('✓ Roles ensured, ADMIN role ID:', adminRole.id);

  // 3. Ensure Permissions
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
  for (const p of permissionsData) {
    const rec = await prisma.permission.upsert({
      where: { resource_action: { resource: p.resource, action: p.action } },
      update: {},
      create: { resource: p.resource, action: p.action, description: `${p.action} ${p.resource}` },
    });
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: rec.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: rec.id },
    });
  }
  console.log('✓ Permissions ensured and assigned to ADMIN');

  // 4. Hash Password & Upsert Admin User
  const passwordHash = await argon2.hash(ADMIN_PASSWORD);
  console.log('✓ Generated Argon2 hash');

  const adminUser = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      name: 'DigiTechzo Administrator',
      passwordHash,
      status: 'ACTIVE',
      organizationId: org.id,
      roleId: adminRole.id,
    },
    create: {
      id: '0f048a4c-0223-475f-9bc8-4e3e026dd9a7',
      email: ADMIN_EMAIL,
      name: 'DigiTechzo Administrator',
      passwordHash,
      status: 'ACTIVE',
      organizationId: org.id,
      roleId: adminRole.id,
    },
  });
  console.log('✓ Admin user successfully upserted in PostgreSQL:', adminUser.id, adminUser.email);

  // 5. Test Argon2 local verification
  const isMatch = await argon2.verify(adminUser.passwordHash, ADMIN_PASSWORD);
  console.log('✓ Local Argon2 verification test:', isMatch ? 'PASSED' : 'FAILED');

  // 6. Test Login on localhost:4000
  console.log('\n--- Testing Local HTTP Login on http://localhost:4000/api/v1/auth/login ---');
  const loginRes = await fetch('http://localhost:4000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  console.log('Local API HTTP Status:', loginRes.status);
  const loginJson = await loginRes.json();
  if (loginRes.ok && loginJson.success) {
    console.log('🎉 LOCAL HTTP LOGIN SUCCEEDED!');
    console.log('User Name:', loginJson.data?.user?.name);
    console.log('Role:', loginJson.data?.user?.role);
    console.log('Token received:', loginJson.data?.accessToken ? 'YES' : 'NO');
  } else {
    console.error('❌ LOCAL HTTP LOGIN FAILED:', JSON.stringify(loginJson));
  }
}

setupAdmin()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
