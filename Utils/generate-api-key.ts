import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Generate a cryptographically secure API key for internal service communication
 * 
 * @param length - Number of bytes (default: 32 for 256-bit security)
 * @returns Hex-encoded API key
 */
function generateSecureApiKey(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Update .env file with the generated API key
 * 
 * @param envPath - Path to the .env file
 * @param apiKey - Generated API key
 */
function updateEnvFile(envPath: string, apiKey: string): void {
  try {
    const envFilePath = path.resolve(envPath);
    
    // Check if .env file exists
    if (!fs.existsSync(envFilePath)) {
      console.warn(`⚠️  Warning: ${envFilePath} not found. Creating new file...`);
      fs.writeFileSync(envFilePath, '');
    }

    // Read existing .env content
    let envContent = fs.readFileSync(envFilePath, 'utf-8');

    // Check if INTERNAL_SERVICE_API_KEY already exists
    const keyPattern = /^INTERNAL_SERVICE_API_KEY=.*/m;
    const keyLine = `INTERNAL_SERVICE_API_KEY=${apiKey}`;

    if (keyPattern.test(envContent)) {
      // Replace existing key
      envContent = envContent.replace(keyPattern, keyLine);
      console.log(`✅ Updated existing key in: ${envFilePath}`);
    } else {
      // Add new key
      if (!envContent.endsWith('\n') && envContent.length > 0) {
        envContent += '\n';
      }
      envContent += `\n# Internal Service Authentication\n${keyLine}\n`;
      console.log(`✅ Added new key to: ${envFilePath}`);
    }

    // Write back to file
    fs.writeFileSync(envFilePath, envContent, 'utf-8');
  } catch (error) {
    console.error(`❌ Error updating ${envPath}:`, (error as Error).message);
  }
}

/**
 * Main execution
 */
function main(): void {
  console.log('\n' + '═'.repeat(80));
  console.log('🔐 Internal Service API Key Generator');
  console.log('═'.repeat(80) + '\n');

  // Generate the API key
  const apiKey = generateSecureApiKey(32);

  console.log('📋 Generated API Key:');
  console.log('─'.repeat(80));
  console.log(apiKey);
  console.log('─'.repeat(80) + '\n');

  // Paths to .env files
  const service1EnvPath = path.join(__dirname, 'PHRMA-PRODUCTION-APP-BACKEND-MAIN', 'config', '.env');
  const service2EnvPath = path.join(__dirname, 'PHRMA-PRODUCTION-APP-BACKEND-MAIN-2', 'config', '.env');

  console.log('📝 Updating .env files...\n');

  // Update both service .env files
  updateEnvFile(service1EnvPath, apiKey);
  updateEnvFile(service2EnvPath, apiKey);

  console.log('\n' + '═'.repeat(80));
  console.log('✅ API Key Generation Complete!');
  console.log('═'.repeat(80) + '\n');

  console.log('📌 Next Steps:');
  console.log('  1. Restart Service 1 (PHRMA-PRODUCTION-APP-BACKEND-MAIN)');
  console.log('  2. Restart Service 2 (PHRMA-PRODUCTION-APP-BACKEND-MAIN-2)');
  console.log('  3. Test notification health endpoint\n');

  console.log('⚠️  Security Reminders:');
  console.log('  • Keep this key SECRET');
  console.log('  • Never commit .env files to Git');
  console.log('  • Rotate keys every 90 days');
  console.log('  • Use different keys for dev/staging/production\n');

  console.log('🔐 Key Strength: 256-bit (64 hex characters)');
  console.log('🔒 Cryptographically Secure: Yes\n');
}

// Execute if run directly
if (require.main === module) {
  main();
}

export { generateSecureApiKey, updateEnvFile };















// import crypto from "crypto";
// /**
//  * Generate a secure random API key for internal service communication
//  */
// function generateApiKey() {
//   // Generate 32 bytes (256 bits) of random data
//   const apiKey = crypto.randomBytes(32).toString('hex');
  
//   console.log('\n🔐 Generated Internal Service API Key:');
//   console.log('═'.repeat(80));
//   console.log(apiKey);
//   console.log('═'.repeat(80));
//   console.log('\n📋 Copy this key to your .env files:\n');
//   console.log(`INTERNAL_SERVICE_API_KEY=${apiKey}\n`);
//   console.log('⚠️  Keep this key SECRET and NEVER commit to Git!\n');
//   console.log('📝 Add to Service 1: PHRMA-PRODUCTION-APP-BACKEND-MAIN/config/.env');
//   console.log('📝 Add to Service 2: PHRMA-PRODUCTION-APP-BACKEND-MAIN-2/config/.env\n');
  
//   return apiKey;
// }

// // Generate and display the key
// generateApiKey();
