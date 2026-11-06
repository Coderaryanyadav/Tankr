const fs = require('fs');
const path = require('path');

try {
  const envPath = path.resolve(__dirname, '../../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach((line) => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^['"](.*)['"]$/, '$1');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
} catch (e) {
  console.warn('Failed to load .env in test setup:', e);
}

// Polyfill global.WebSocket for Node.js environments (e.g. Node 20 in CI)
try {
  if (typeof global.WebSocket === 'undefined') {
    global.WebSocket = require('ws');
  }
} catch {
  // Ignore if ws is not available
}

// Fallback test environment configuration for CI / automated test suites
if (!process.env.EXPO_PUBLIC_SUPABASE_URL) {
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://qicoczialqxulcbipuix.supabase.co';
}
if (!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpY29jemlhbHF4dWxjYmlwdWl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzNzI3OTMsImV4cCI6MjEwODk0ODc5M30.aTT8i9UAydWN33n0SrlZKBmPCgYBmdizgSENAPLfR6Q';
}
if (!process.env.EXPO_PUBLIC_MAPPLS_REST_KEY) {
  process.env.EXPO_PUBLIC_MAPPLS_REST_KEY = 'mock_mappls_rest_key';
}
if (!process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID) {
  process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID = 'rzp_test_mock_key';
}
