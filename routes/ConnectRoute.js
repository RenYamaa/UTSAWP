const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'comifuro'
});

connection.connect((err) =>{
    if(err) {
        console.error('Error Connection to Database: ' + err);
    }
    console.log('Connected to Database!');
});

module.exports = connection;