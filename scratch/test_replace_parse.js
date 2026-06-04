const fs = require('fs');
const envContent = fs.readFileSync('.env', 'utf8');
const match = envContent.match(/FIREBASE_SERVICE_ACCOUNT_KEY='([\s\S]+?)'/);
if (match) {
    let val = match[1];
    // Replace all escaped quotes \\" with "
    const replaced = val.replace(/\\"/g, '"');
    try {
        const sa = JSON.parse(replaced);
        console.log("Successfully parsed after replacement!");
        console.log("Project ID:", sa.project_id);
        console.log("Client Email:", sa.client_email);
    } catch (e) {
        console.log("Still failed to parse:", e.message);
    }
}
