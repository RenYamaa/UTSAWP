const mysql = require('mysql2');

const pool = mysql.createPool({
    uri: process.env.DATABASE_URL, 
    waitForConnections: true,
    connectionLimit: 10,      
    queueLimit: 0           
});

console.log('Connection Pool (Kolam Koneksi) siap digunakan.');

module.exports = pool;