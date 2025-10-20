const express = require('express');
const path = require('path');
const app = express();
const conn = require('./routes/ConnectRoute');
const { workerData } = require('worker_threads');
const PORT = 3000;
const session = require('express-session');

app.use(express.static(path.join(__dirname)));
app.use(express.urlencoded({extended:true}));
app.use(express.json());
app.use(session({
    secret: '1UAz582xe92nycoir2FB',
    resave: false,
    saveUninitialized: false
}));

const sql = `
    SELECT U.*, R.RoleName
    FROM cf_user AS U
    JOIN cf_roles AS R ON U.ID_Role = R.ID_Role
    WHERE U.Username = ? AND BINARY U.Password = ?
`;

app.get('/', (req,res) => {
    res.send(`
        <h1>Comifuro Database</h1>
        <a href="http://localhost:3000/login">Login</a>
        `);
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '/html/loginPage.html'));
});

app.post('/login', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    conn.query(sql, [username, password], (err, results) => {
        if(err){
            console.error("Database Gagal Di Ambil! Error: " + err);
            return;
        }

        if(results.length > 0){
            req.session.user = results[0];
            console.log(results[0]);
            res.redirect('/main-menu');
        } else {
            res.set('Refresh', '2; url=http://localhost:3000/login'); 
            res.send("Login Gagal! Username Atau Password Salah!");
        }
    });
});

app.get('/main-menu', (req,res) => {
    if(!req.session.user){
        return res.redirect('/login');
    } 

    const user = req.session.user;
    let menuHTML = '';

    switch (user.ID_Role){
        case 'R01':
            res.set('X-User-Data', JSON.stringify({
                username: user.Username,
                role: user.RoleName
            }));
            res.sendFile(path.join(__dirname, '/html/managerPage.html'));
            break;
        case 'R02':
            res.sendFile(path.join(__dirname, '/html/stafPage.html'));
            break;
        case 'R03':
            res.sendFile(path.join(__dirname, '/html/financePage.html'));
            break;
        case 'R04':
        default:
            res.sendFile(path.join(__dirname, '/html/userPage.html'));
            break;
    }
});

app.get('/signout', (req,res) => {
    req.session.destroy(err => {
        if(err){
            console.error("Failed to delete Session! error: ", err);
            return res.redirect('/login');
        }

        res.redirect('/login');
    });
});

app.get('/user-info', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ username: "Guest", role: "Unauthorized" });
    }
    res.json({
        username: req.session.user.Username,
        role: req.session.user.RoleName
    });
});

app.post('/api/user/create', (req, res) => {
    const { username, email, password, phone, role } = req.body;

    if (!username || !password || !email || !phone || !role) {
        return res.status(400).json({ message: "Semua field wajib diisi!" });
    }

    const getLastIdQuery = `SELECT User_ID FROM cf_user ORDER BY User_ID DESC LIMIT 1`;

    conn.query(getLastIdQuery, (err, results) => {
        if (err) {
            console.error("Gagal mengambil User_ID terakhir:", err);
            return res.status(500).json({ message: "Database error saat mengambil ID terakhir." });
        }

        let nextIdNumber = 1;

        if (results.length > 0) {
            const lastId = results[0].User_ID; 
            const lastNumber = parseInt(lastId.replace("USR", ""), 10);
            nextIdNumber = lastNumber + 1;
        }

        const newUserId = "USR" + String(nextIdNumber).padStart(3, "0");

        const insertQuery = `
            INSERT INTO cf_user (User_ID, Username, Email, Password, Phone, ID_Role)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        conn.query(insertQuery, [newUserId, username, email, password, phone, role], (err, results) => {
            if (err) {
                console.error("Insert Failed:", err);
                if (err.code === "ER_DUP_ENTRY") {
                    return res.status(400).json({ message: "Username sudah terdaftar. Gunakan yang lain." });
                }
                return res.status(500).json({ message: "Gagal menambahkan user ke database." });
            }

            res.status(201).json({
                message: "User berhasil dibuat!",
                userId: newUserId
            });
        });
    });
});

app.get('/api/user/read', (req, res) => {
    if (!req.session.user || req.session.user.ID_Role !== 'R01') {
        return res.status(401).json({ message: 'Akses Ditolak!' });
    }

    const sqlRead = `
        SELECT 
            U.User_ID, 
            U.Username, 
            U.Email, 
            U.Phone, 
            U.ID_Role, 
            R.RoleName
        FROM cf_user AS U
        JOIN cf_roles AS R ON U.ID_Role = R.ID_Role
    `;

    conn.query(sqlRead, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Database Error' });
        }

        res.json(results);
    });
});

// UPDATE USER
app.put('/api/user/update/:id', (req, res) => {
    const userId = req.params.id;
    const { username, email, password, phone, role } = req.body;

    if (!username || !email || !phone || !role) {
        return res.status(400).json({ message: "Semua field wajib diisi!" });
    }

    let updateQuery = `
        UPDATE cf_user
        SET Username = ?, Email = ?, Phone = ?, ID_Role = ?
    `;
    const params = [username, email, phone, role];

    if (password && password.trim() !== '') {
        updateQuery += `, Password = ?`;
        params.push(password);
    }

    updateQuery += ` WHERE User_ID = ?`;
    params.push(userId);

    conn.query(updateQuery, params, (err, results) => {
        if (err) {
            console.error('Update failed:', err);
            return res.status(500).json({ message: "Gagal mengupdate data user." });
        }

        res.status(200).json({ message: "User berhasil diupdate!" });
    });
});

// DELETE USER
app.delete('/api/user/delete/:id', (req, res) => {
    const userId = req.params.id;

    const deleteQuery = `DELETE FROM cf_user WHERE User_ID = ?`;

    conn.query(deleteQuery, [userId], (err, results) => {
        if (err) {
            console.error('Delete failed:', err);
            return res.status(500).json({ message: "Gagal menghapus user." });
        }

        if (results.affectedRows === 0) {
            return res.status(404).json({ message: "User tidak ditemukan." });
        }

        res.status(200).json({ message: "User berhasil dihapus!" });
    });
});

// GET semua produk
app.get('/api/product/read', (req, res) => {
    const sql = `
        SELECT ID_Product, Product_Name, Stock, Price, Status, Description
        FROM cf_products
    `;
    conn.query(sql, (err, results) => {
        if (err) {
            console.error('Gagal mengambil data produk:', err);
            return res.status(500).json({ message: 'Gagal mengambil data produk' });
        }
        res.status(200).json(results);
    });
});

// INSERT produk baru
app.post('/api/product/add', (req, res) => {
    let { id, name, stock, price, status, description } = req.body;

    if (!name || !price || !status) {
        return res.status(400).json({ message: 'Nama, harga, dan status wajib diisi!' });
    }

    // Kalau user tidak isi ID → generate otomatis
    if (!id || id.trim() === '') {
        const getLastId = `SELECT ID_Product FROM cf_products ORDER BY ID_Product DESC LIMIT 1`;
        conn.query(getLastId, (err, results) => {
            if (err) {
                console.error('Gagal mengambil ID terakhir:', err);
                return res.status(500).json({ message: 'Gagal mengambil ID terakhir' });
            }

            let nextIdNumber = 1;
            if (results.length > 0) {
                const lastId = results[0].ID_Product; // contoh: "A005"
                const numericPart = parseInt(lastId.replace(/\D/g, ''), 10); // ambil angka dari string
                nextIdNumber = numericPart + 1;
            }

            const newId = 'A' + String(nextIdNumber).padStart(3, '0'); // hasil: A001, A002, dst.

            const sqlInsert = `
                INSERT INTO cf_products (ID_Product, Product_Name, Stock, Price, Status, Description)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            conn.query(sqlInsert, [newId, name, stock, price, status, description], (err2) => {
                if (err2) {
                    console.error('Gagal menambah produk:', err2);
                    return res.status(500).json({ message: 'Gagal menambah produk' });
                }
                res.status(201).json({ message: `Produk berhasil ditambahkan dengan ID ${newId}!` });
            });
        });
    } else {
        // Kalau user isi ID → pakai ID tersebut
        const sqlInsert = `
            INSERT INTO cf_products (ID_Product, Product_Name, Stock, Price, Status, Description)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        conn.query(sqlInsert, [id, name, stock, price, status, description], (err) => {
            if (err) {
                console.error('Gagal menambah produk:', err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ message: 'ID produk sudah digunakan. Gunakan ID lain.' });
                }
                return res.status(500).json({ message: 'Gagal menambah produk' });
            }
            res.status(201).json({ message: 'Produk berhasil ditambahkan!' });
        });
    }
});


// UPDATE produk
app.put('/api/product/update/:id', (req, res) => {
    const productId = req.params.id;
    const { name, stock, price, status, description } = req.body;

    const sql = `
        UPDATE cf_products 
        SET Product_Name=?, Stock=?, Price=?, Status=?, Description=?
        WHERE ID_Product=?
    `;
    conn.query(sql, [name, stock, price, status, description, productId], (err) => {
        if (err) {
            console.error('Gagal mengupdate produk:', err);
            return res.status(500).json({ message: 'Gagal mengupdate produk' });
        }
        res.status(200).json({ message: 'Produk berhasil diupdate!' });
    });
});

// DELETE produk
app.delete('/api/product/delete/:id', (req, res) => {
    const productId = req.params.id;
    const sql = `DELETE FROM cf_products WHERE ID_Product=?`;
    conn.query(sql, [productId], (err) => {
        if (err) {
            console.error('Gagal menghapus produk:', err);
            return res.status(500).json({ message: 'Gagal menghapus produk' });
        }
        res.status(200).json({ message: 'Produk berhasil dihapus!' });
    });
});

// ========== STAF PAGE API (update produk saja) ==========

// Ambil semua produk (bisa sama dengan route /api/product/read)
app.get('/api/staff/products', (req, res) => {
    const sql = `
        SELECT ID_Product, Product_Name, Stock, Price, Status, Description
        FROM cf_products
        ORDER BY ID_Product ASC
    `;
    conn.query(sql, (err, results) => {
        if (err) {
            console.error('Gagal mengambil data produk:', err);
            return res.status(500).json({ message: 'Gagal mengambil data produk' });
        }
        res.status(200).json(results);
    });
});

// Update kolom tertentu (stok atau status)
app.put('/api/staff/update/:id', (req, res) => {
    const productId = req.params.id;
    const { stock, status } = req.body;

    // Minimal salah satu diisi
    if (stock === undefined && !status) {
        return res.status(400).json({ message: 'Tidak ada data yang diperbarui' });
    }

    // Buat query dinamis sesuai field yang dikirim
    const fields = [];
    const values = [];

    if (stock !== undefined) {
        fields.push('Stock = ?');
        values.push(stock);
    }
    if (status) {
        fields.push('Status = ?');
        values.push(status);
    }

    values.push(productId);

    const sql = `UPDATE cf_products SET ${fields.join(', ')} WHERE ID_Product = ?`;

    conn.query(sql, values, (err, result) => {
        if (err) {
            console.error('Gagal memperbarui produk:', err);
            return res.status(500).json({ message: 'Gagal memperbarui produk' });
        }
        res.status(200).json({ message: 'Produk berhasil diperbarui!' });
    });
});


app.listen(PORT, () => {
    console.log(`Server Running At http://localhost:${PORT}`);
});