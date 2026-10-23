const fetch = globalThis.fetch;

async function deleteUser() {
  const loginRes = await fetch('https://digitechzo-crm-api.onrender.com/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@digitechzo.com', password: 'AdminSecurePassword123!' }),
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.accessToken;
  console.log('Logged in. Token acquired.');

  const userId = '121fc497-45c4-4096-9cb0-add599bcb1c6';
  
  const delRes = await fetch(`https://digitechzo-crm-api.onrender.com/api/v1/users/${userId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const delData = await delRes.json();
  console.log('Delete response status:', delRes.status, delData);

  // Now fetch users again to see what changed
  const usersRes = await fetch('https://digitechzo-crm-api.onrender.com/api/v1/users', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const usersData = await usersRes.json();
  console.log('Current users after delete:', JSON.stringify(usersData.data?.data || usersData, null, 2));
}

deleteUser().catch(console.error);
