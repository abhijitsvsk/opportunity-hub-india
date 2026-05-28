require('dotenv').config();

const requiredKeys = ['GEMINI_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
let missing = false;

for (const key of requiredKeys) {
  const value = process.env[key];
  if (!value || value.trim() === '' || value.includes('your_')) {
    console.error(`❌ Missing or invalid environment variable: ${key}`);
    missing = true;
  }
}

if (missing) {
  console.error('\nEnvironment validation failed! Please update your .env file with real keys.');
  process.exit(1);
}

console.log('✅ Environment validation passed! All required keys are present.');
process.exit(0);
