const fs = require('fs');
const path = require('path');

// Target regex constructed dynamically to prevent self-matching in scanner script source
const TARGET_PATTERNS = [
  new RegExp(['798', '462', '2267'].join('')),
  new RegExp(['992', '433', '1253'].join('')),
  new RegExp(['982', '592', '0188'].join(''))
];
const EXCLUDED_DIRS = ['node_modules', '.git', 'dist', 'build', '.tempmediaStorage'];

let hasViolations = false;

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.includes(entry.name)) {
        scanDir(fullPath);
      }
    } else if (entry.isFile()) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        for (const pattern of TARGET_PATTERNS) {
          if (pattern.test(content)) {
            console.error(`PRIVACY VIOLATION DETECTED in file ${fullPath}`);
            hasViolations = true;
          }
        }
      } catch (err) {
        // Skip unreadable binary files
      }
    }
  }
}

console.log('Running Privacy & Personal Data Safeguard Check...');
scanDir(path.resolve(__dirname, '..'));

if (hasViolations) {
  console.error('FAIL: Real personal data found in codebase! Standardize test data to 90000000XX.');
  process.exit(1);
} else {
  console.log('PASS: Zero personal data violations detected in project repository.');
}
