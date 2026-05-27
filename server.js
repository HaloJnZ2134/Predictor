const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const db = new sqlite3.Database("./mines.db");

// create table
db.run(`
CREATE TABLE IF NOT EXISTS rounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clientSeed TEXT,
    serverSeed TEXT,
    nonce TEXT,
    minesCount INTEGER,
    gridSize INTEGER,
    mineLocations TEXT,
    timestamp INTEGER
)
`);

// SAVE ROUND
app.post("/save-round", (req, res) => {

    const {
        clientSeed,
        serverSeed,
        nonce,
        minesCount,
        gridSize,
        mineLocations,
        timestamp
    } = req.body;

    db.run(
        `INSERT INTO rounds 
        (clientSeed, serverSeed, nonce, minesCount, gridSize, mineLocations, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            clientSeed,
            serverSeed,
            nonce,
            minesCount,
            gridSize,
            JSON.stringify(mineLocations),
            timestamp
        ]
    );

    res.json({ success:true });
});

// GET HISTORY
app.get("/history", (req,res)=>{

    db.all(`SELECT * FROM rounds ORDER BY id DESC LIMIT 50`, [], (err,rows)=>{
        res.json(rows);
    });

});

// ANALYTICS
app.get("/stats", (req,res)=>{

    db.all(`SELECT mineLocations FROM rounds`, [], (err,rows)=>{

        const counts = {};

        rows.forEach(r=>{
            JSON.parse(r.mineLocations).forEach(i=>{
                counts[i] = (counts[i] || 0) + 1;
            });
        });

        res.json(counts);
    });

});

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
