const dotenv = require('dotenv');
dotenv.config();

const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!key) {
  console.log("FIREBASE_SERVICE_ACCOUNT_KEY is not defined in .env");
  process.exit(1);
}

console.log("Length:", key.length);
console.log("Starts with:", key.substring(0, 30));
console.log("Ends with:", key.substring(key.length - 30));

let cleanKey = "";
try {
  cleanKey = key.trim();
  if (cleanKey.startsWith("'") && cleanKey.endsWith("'")) {
    cleanKey = cleanKey.slice(1, -1);
  }
  JSON.parse(cleanKey);
  console.log("JSON is valid!");
} catch (e) {
  console.log("JSON parse error:", e.message);
  // Find where it fails
  for (let i = 1; i <= cleanKey.length; i++) {
    try {
      JSON.parse(cleanKey.substring(0, i));
    } catch (err) {
      if (!err.message.includes("Unexpected end of JSON")) {
        console.log(`First error at position ${i}:`, err.message);
        console.log("Context:", cleanKey.substring(Math.max(0, i - 15), Math.min(cleanKey.length, i + 15)));
        break;
      }
    }
  }
}
