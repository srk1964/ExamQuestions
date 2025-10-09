const fetch = require('node-fetch');

async function main() {
  const api = process.env.API_URL || 'https://kxrtpm3x74.execute-api.us-east-1.amazonaws.com/prod/';
  const cf = process.env.CLOUDFRONT_URL || 'https://d3k3zexmg1qdq2.cloudfront.net';

  console.log('Testing CloudFront root:', cf);
  const cfResp = await fetch(cf);
  console.log('CloudFront status:', cfResp.status);

  const listUrl = api + 'list-subjects?subject=networking';
  console.log('Testing API list-subjects:', listUrl);
  const listResp = await fetch(listUrl);
  console.log('API status:', listResp.status);
  const body = await listResp.text();
  console.log('API body preview:', body.slice(0, 200));

  if (cfResp.status !== 200) throw new Error('CloudFront root not 200');
  if (listResp.status !== 200) throw new Error('API list-subjects not 200');

  console.log('Smoke tests passed');
}

main().catch(err => { console.error(err); process.exit(1); });
