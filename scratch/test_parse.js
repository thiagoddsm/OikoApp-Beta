require('dotenv').config();
const fs = require('fs');

console.log("process.env.FIREBASE_SERVICE_ACCOUNT_KEY exists:", !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    console.log("Length:", process.env.FIREBASE_SERVICE_ACCOUNT_KEY.length);
    console.log("Starts with:", process.env.FIREBASE_SERVICE_ACCOUNT_KEY.substring(0, 30));
    console.log("Ends with:", process.env.FIREBASE_SERVICE_ACCOUNT_KEY.substring(process.env.FIREBASE_SERVICE_ACCOUNT_KEY.length - 30));
    try {
        let cleanKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
        if (cleanKey.startsWith("'") && cleanKey.endsWith("'")) {
            cleanKey = cleanKey.slice(1, -1);
        }
        const sa = JSON.parse(cleanKey);
        console.log("Successfully parsed with dotenv + cleanKey!");
        console.log("Project ID:", sa.project_id);
    } catch (e) {
        console.log("Failed parsing dotenv version:", e.message);
    }
}

const envContent = fs.readFileSync('.env', 'utf8');
const match = envContent.match(/FIREBASE_SERVICE_ACCOUNT_KEY=['"]([\s\S]+?)['"]/);
console.log("Regex match exists:", !!match);
if (match) {
    console.log("Match length:", match[1].length);
    console.log("Match starts with:", match[1].substring(0, 30));
    try {
        let cleanKey = match[1].trim();
        const sa = JSON.parse(cleanKey);
        console.log("Successfully parsed regex match!");
    } catch (e) {
        console.log("Failed parsing regex match:", e.message);
    }
}
