const https = require('https');

https.get('https://digitechzo-crm.vercel.app?' + Date.now(), (res) => {
  console.log('x-vercel-id:', res.headers['x-vercel-id']);
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const assets = data.match(/\/assets\/[^\"]+/g);
    console.log('Live assets on Vercel:', assets);
  });
});
