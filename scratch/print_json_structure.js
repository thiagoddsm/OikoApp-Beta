const fs = require('fs');
const envContent = fs.readFileSync('.env', 'utf8');
const match = envContent.match(/FIREBASE_SERVICE_ACCOUNT_KEY='([\s\S]+?)'/);
if (match) {
    let val = match[1];
    // Replace the private key content to avoid printing it
    val = val.replace(/"private_key":"[\s\S]+?"/, '"private_key":"<HIDDEN>"');
    console.log("Structure of JSON:");
    console.log(val);
}
