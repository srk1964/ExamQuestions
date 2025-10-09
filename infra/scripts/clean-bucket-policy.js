const { S3Client, GetBucketPolicyCommand, PutBucketPolicyCommand } = require("@aws-sdk/client-s3");
const fs = require('fs');

async function main() {
  const bucket = process.argv[2];
  if (!bucket) {
    console.error('Usage: node clean-bucket-policy.js <bucket-name>');
    process.exit(2);
  }

  const client = new S3Client({});

  try {
    const get = await client.send(new GetBucketPolicyCommand({ Bucket: bucket }));
    const policy = JSON.parse(get.Policy);
    const originalStatements = policy.Statement || [];

    const filtered = originalStatements.filter(s => {
      try {
        if (!s.Principal) return true;
        const p = s.Principal.AWS;
        if (!p) return true;
        if (Array.isArray(p)) {
          return !p.some(item => typeof item === 'string' && item.includes('Origin Access Identity'));
        }
        if (typeof p === 'string') {
          return !p.includes('Origin Access Identity');
        }
        return true;
      } catch (e) {
        return true;
      }
    });

    if (filtered.length === originalStatements.length) {
      console.log('No OAI statements found. Nothing to do.');
      return;
    }

    policy.Statement = filtered;
    const newPolicy = JSON.stringify(policy, null, 2);

    // Write to file for audit
    fs.writeFileSync('policy-clean.json', newPolicy, 'utf8');

    await client.send(new PutBucketPolicyCommand({ Bucket: bucket, Policy: newPolicy }));
    console.log('Bucket policy updated and saved to policy-clean.json');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main();
