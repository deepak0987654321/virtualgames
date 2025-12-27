
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function test() {
    console.log("Testing SQLite connection...");
    try {
        const db = await open({
            filename: path.join(__dirname, 'database', 'virtualgames.sqlite'),
            driver: sqlite3.Database
        });
        console.log("Connection successful!");
        await db.close();
    } catch (e) {
        console.error("Connection failed:", e);
    }
}

test();
