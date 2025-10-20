const mysql = require('mysql2');

const connection = mysql.createConnection(process.env.DATABASE_URL);

connection.connect((err) =>{
    if(err) {
        console.error('Error Connection to Database: ' + err);
        return;
    }
    console.log('Connected to Database!');
});

module.exports = connection;