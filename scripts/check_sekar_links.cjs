const fetch = globalThis.fetch;

async function checkLinkedData() {
  const loginRes = await fetch('https://digitechzo-crm-api.onrender.com/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@digitechzo.com', password: 'AdminSecurePassword123!' }),
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.accessToken;

  const userId = '121fc497-45c4-4096-9cb0-add599bcb1c6';

  const [leadsRes, dealsRes, tasksRes] = await Promise.all([
    fetch(`https://digitechzo-crm-api.onrender.com/api/v1/leads?ownerId=${userId}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    fetch(`https://digitechzo-crm-api.onrender.com/api/v1/deals?ownerId=${userId}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    fetch(`https://digitechzo-crm-api.onrender.com/api/v1/tasks?assigneeId=${userId}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
  ]);

  console.log('Leads for sekar:', leadsRes.data?.total || leadsRes.data?.items?.length || 0);
  console.log('Deals for sekar:', dealsRes.data?.total || dealsRes.data?.deals?.length || 0);
  console.log('Tasks for sekar:', tasksRes.data?.total || tasksRes.data?.items?.length || 0);
}

checkLinkedData().catch(console.error);
