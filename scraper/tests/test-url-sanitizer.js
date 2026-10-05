const { sanitizeOpportunityUrl } = require('../url-sanitizer');
const assert = require('assert');

function runTests() {
  console.log('Running URL Sanitizer Unit Tests...\n');

  // Test 1: Y Combinator Workatastartup URL canonicalization
  const ycTest = sanitizeOpportunityUrl('https://www.workatastartup.com/companies/retell-ai/jobs/JPZAQpI-customer-success-engineer-contract');
  assert.strictEqual(ycTest.valid, true);
  assert.strictEqual(ycTest.url, 'https://www.ycombinator.com/companies/retell-ai/jobs/JPZAQpI-customer-success-engineer-contract');
  console.log('✅ Test 1 Passed: YC domain canonicalization');

  // Test 2: Double slash collapsing
  const slashTest = sanitizeOpportunityUrl('https://careers.google.com//jobs//results//12345/');
  assert.strictEqual(slashTest.valid, true);
  assert.strictEqual(slashTest.url, 'https://careers.google.com/jobs/results/12345');
  console.log('✅ Test 2 Passed: Double slash collapsing & trailing slash normalization');

  // Test 3: Tracking parameter stripping
  const utmTest = sanitizeOpportunityUrl('https://unstop.com/hackathons/my-hackathon-123?utm_source=telegram&utm_medium=channel&ref=friend&keep_this=true');
  assert.strictEqual(utmTest.valid, true);
  assert.strictEqual(utmTest.url, 'https://unstop.com/hackathons/my-hackathon-123?keep_this=true');
  console.log('✅ Test 3 Passed: UTM & tracking noise stripped, genuine params kept');

  // Test 4: Discord private permalink rejection
  const discordTest = sanitizeOpportunityUrl('https://discord.com/channels/123456789/987654321/111222333');
  assert.strictEqual(discordTest.valid, false);
  assert.strictEqual(discordTest.error, 'raw_discord_channel_permalink_forbidden');
  console.log('✅ Test 4 Passed: Discord channel permalink safely rejected');

  // Test 5: Double URL encoding (%2520 -> %20)
  const doubleEncodeTest = sanitizeOpportunityUrl('https://jobs.lever.co/company/Senior%2520Software%2520Engineer');
  assert.strictEqual(doubleEncodeTest.valid, true);
  assert.strictEqual(doubleEncodeTest.url, 'https://jobs.lever.co/company/Senior%20Software%20Engineer');
  console.log('✅ Test 5 Passed: Double URL encoding unwrapped');

  console.log('\n🎉 ALL URL SANITIZER TESTS PASSED!');
}

runTests();
