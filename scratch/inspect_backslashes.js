const fs = require('fs');
const envContent = fs.readFileSync('.env', 'utf8');
const match = envContent.match(/FIREBASE_SERVICE_ACCOUNT_KEY='([\s\S]+?)'/);
if (match) {
    const val = match[1];
    console.log("Val length:", val.length);
    // Find where backslashes appear
    let backslashes = [];
    for (let i = 0; i < val.length; i++) {
        if (val[i] === '\\') {
            backslashes.push({ index: i, context: val.substring(i - 10, i + 15) });
        }
    }
    console.log("Number of backslashes:", backslashes.length);
    console.log("First 5 backslashes:", backslashes.slice(0, 5));
    console.log("Last 5 backslashes:", backslashes.slice(-5));
}
