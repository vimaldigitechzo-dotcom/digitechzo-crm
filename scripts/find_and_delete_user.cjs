const fetch = globalThis.fetch;

async function checkUser() {
  const loginRes = await fetch('https://digitechzo-crm-api.onrender.com/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@digitechzo.com', password: 'AdminSecurePassword123!' }),
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.accessToken;
  console.log('Logged in. Token acquired.');

  const usersRes = await fetch('https://digitechzo-crm-api.onrender.com/api/v1/users', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const usersData = await usersRes.json();
  const users = usersData.data || usersData.items || usersData;
  console.log('Total users:', Array.isArray(users) ? users.length : 'Not array');
  
  if (Array.isArray(users)) {
    users.forEach(u => {
      console.log(`- ID: ${u.id} | Name: "${u.firstName} ${u.lastName}" / "${u.name}" | Email: "${u.email}" | Status: ${u.status}`);
    });
  } else {
    console.log('Response:', JSON.stringify(usersData, null, 2));
  }
}

checkUser().catch(console.error);
