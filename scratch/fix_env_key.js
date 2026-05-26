const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf8');
const lines = envContent.split(/\r?\n/);
let updated = false;

const newLines = lines.map(line => {
  if (line.startsWith('FIREBASE_SERVICE_ACCOUNT_KEY=')) {
    // Extract the value
    const match = line.match(/^FIREBASE_SERVICE_ACCOUNT_KEY='([\s\S]+?)'$/) || line.match(/^FIREBASE_SERVICE_ACCOUNT_KEY="([\s\S]+?)"$/) || line.match(/^FIREBASE_SERVICE_ACCOUNT_KEY=([\s\S]+)$/);
    if (match) {
      let val = match[1];
      // Clean up the escaped quotes
      const cleanedVal = val.replace(/\\"/g, '"');
      // Verify if it is valid JSON
      try {
        JSON.parse(cleanedVal);
        console.log("Cleaned value is valid JSON!");
        updated = true;
        return `FIREBASE_SERVICE_ACCOUNT_KEY='${cleanedVal}'`;
      } catch (e) {
        console.log("Could not parse cleaned value:", e.message);
      }
    }
  }
  return line;
});

if (updated) {
  fs.writeFileSync('.env', newLines.join('\n'), 'utf8');
  console.log("Successfully updated .env file!");
} else {
  console.log("No update was made to .env.");
}
