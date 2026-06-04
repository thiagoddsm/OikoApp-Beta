const fs = require('fs');
const envContent = fs.readFileSync('.env', 'utf8');
const lines = envContent.split(/\r?\n/);
lines.forEach((line, i) => {
    if (line.includes('FIREBASE_SERVICE_ACCOUNT_KEY')) {
        console.log(`Line ${i + 1}: length ${line.length}`);
        console.log(`Starts with:`, line.substring(0, 100));
        console.log(`Ends with:`, line.substring(line.length - 100));
    }
});
const match = envContent.match(/FIREBASE_SERVICE_ACCOUNT_KEY='([\s\S]+?)'/);
if (match) {
    console.log("Matched group length:", match[1].length);
    console.log("Matched group start:", match[1].substring(0, 100));
} else {
    console.log("No single quote match");
}
