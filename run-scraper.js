// Simple script to run the scraper from root directory
const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting Michelin restaurant scraper...');

try {
  // Change to scripts directory and run scraper
  const scriptsDir = path.join(__dirname, 'backend', 'scripts');
  process.chdir(scriptsDir);

  console.log('📦 Installing dependencies...');
  execSync('npm install', { stdio: 'inherit' });

  console.log('🌟 Running scraper...');
  execSync('npm run scrape', { stdio: 'inherit' });

  console.log('💾 Running database seeder...');
  execSync('npm run seed-production', { stdio: 'inherit' });

  console.log('✅ Scraping and seeding completed!');
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}