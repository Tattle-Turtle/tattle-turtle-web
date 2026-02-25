// Environment Configuration Checker
// Run this with: node check-env.js

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env.local') });
dotenv.config();

console.log('\n🔍 Checking Environment Configuration...\n');

const checks = [
  {
    name: 'GEMINI_API_KEY',
    value: process.env.GEMINI_API_KEY,
    required: true,
    validate: (val) => val && val.startsWith('AIza') && !val.includes('REPLACE'),
    help: 'Get your Gemini API key from https://ai.google.dev/'
  },
  {
    name: 'SUPABASE_URL',
    value: process.env.SUPABASE_URL,
    required: true,
    validate: (val) => val && val.startsWith('https://') && val.includes('supabase.co') && !val.includes('REPLACE'),
    help: 'Get from Supabase Project Settings → API'
  },
  {
    name: 'SUPABASE_ANON_KEY',
    value: process.env.SUPABASE_ANON_KEY,
    required: true,
    validate: (val) => val && val.startsWith('eyJ') && !val.includes('REPLACE'),
    help: 'Get from Supabase Project Settings → API'
  }
];

let allValid = true;

// Check if .env.local exists
const envLocalPath = path.resolve(__dirname, '.env.local');
if (!fs.existsSync(envLocalPath)) {
  console.log('❌ .env.local file not found!');
  console.log('   Run: cp .env.example .env.local\n');
  allValid = false;
} else {
  console.log('✅ .env.local file exists\n');
}

// Check each environment variable
checks.forEach(check => {
  const isSet = !!check.value;
  const isValid = check.validate(check.value);

  if (!isSet) {
    console.log(`❌ ${check.name}: Not set`);
    console.log(`   ${check.help}\n`);
    allValid = false;
  } else if (!isValid) {
    console.log(`⚠️  ${check.name}: Set but appears invalid`);
    console.log(`   Current: ${check.value.substring(0, 20)}...`);
    console.log(`   ${check.help}\n`);
    allValid = false;
  } else {
    console.log(`✅ ${check.name}: Valid`);
    console.log(`   ${check.value.substring(0, 20)}...\n`);
  }
});

// Final result
console.log('─'.repeat(50));
if (allValid) {
  console.log('\n✅ All environment variables are configured correctly!');
  console.log('   You can now run: npm run dev\n');
} else {
  console.log('\n❌ Please fix the issues above before running the app.');
  console.log('   See SETUP.md for detailed instructions.\n');
  process.exit(1);
}
