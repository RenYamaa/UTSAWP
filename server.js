const express = require('express');
const path = require('path');
const app = express();
const conn = require('./routes/ConnectRoute');
const PORT = 3000;
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');

app.use(express.static(path.join(__dirname)));
app.use(express.urlencoded({extended:true}));
app.use(express.json());
app.use(session({
    secret: '3q1aExxcHYSYSicpcDFTWmsvzLAPERxt',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, secure: false, maxAge: 24 * 60 * 60 * 1000 } 
}));

// Middleware untuk cek login di semua rute API
const checkAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ message: "Akses ditolak. Silakan login." });
    }
    next();
};


const sql = `
    SELECT U.*, R.RoleName
    FROM cf_user AS U
    JOIN cf_roles AS R ON U.ID_Role = R.ID_Role
    WHERE U.Username = ? AND BINARY U.Password = ?
`;

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/html/homePage.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '/html/loginPage.html'));
});

app.post('/login', (req, res) => {
    const { username, password, keep } = req.body;

    const sql = `
        SELECT U.*, R.RoleName FROM cf_user AS U
        JOIN cf_roles AS R ON U.ID_Role = R.ID_Role
        WHERE U.Username = ? AND BINARY U.Password = ?
    `;

    conn.query(sql, [username, password], (err, results) => {
        if (err) {
            console.error("Database Error:", err);
            return res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
        }

        if (results.length > 0) {
            const user = results[0];

            // Pengecekan baru: Akun harus berstatus 'Aktif'
            if (user.Account_Status !== 'Aktif') {
                return res.status(403).json({ success: false, message: 'Akun Anda belum aktif. Hubungi manajer.' });
            }

            // Atur durasi cookie jika "Keep me signed in" dicentang
            if (keep) {
                req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 hari
            }
            
            req.session.user = user;
            return res.json({ success: true });

        } else {
            // Jika username/password salah
            return res.status(401).json({ success: false, message: 'Username atau Password salah!' });
        }
    });
});

app.get('/api/homepage/products', (req, res) => {
    // Kita ambil semua data yang dibutuhkan: ID, Nama, dan Stok
    const sql = "SELECT ID_Product, Product_Name, Stock FROM cf_products ORDER BY ID_Product ASC";
    conn.query(sql, (err, results) => {
        if (err) {
            console.error('Gagal mengambil data produk untuk homepage:', err);
            return res.status(500).json([]); // Kirim array kosong jika error
        }
        res.json(results);
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
        userId: req.session.user.User_ID, 
        username: req.session.user.Username,
        role: req.session.user.RoleName
    });
});

// ==========================================================
// API UNTUK USER (PELANGGAN) - R04
// ==========================================================

// GET produk yang statusnya 'Aktif'
app.get('/api/products/active', (req, res) => {
    const sql = "SELECT * FROM cf_products WHERE Status = 'Aktif' AND Stock > 0 ORDER BY Product_Name ASC";
    conn.query(sql, (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json(results);
    });
});

// GET isi keranjang user
app.get('/api/cart', checkAuth, (req, res) => {
    const userId = req.session.user.User_ID;
    const sql = `
        SELECT c.Carts_ID, c.Jumlah, p.ID_Product, p.Product_Name, p.Price, p.Stock
        FROM cf_carts c
        JOIN cf_products p ON c.ID_Product = p.ID_Product
        WHERE c.User_ID = ?
    `;
    conn.query(sql, [userId], (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json(results);
    });
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '/html/registerPage.html'));
});

app.post('/register', (req, res) => {
    const { username, email, phone, password } = req.body;
    
    // Validasi dasar di server
    if (!username || !email || !phone || !password) {
        return res.status(400).json({ success: false, message: "Semua field wajib diisi." });
    }

    // Cek duplikasi username atau email
    const checkDupSql = "SELECT * FROM cf_user WHERE Username = ? OR Email = ?";
    conn.query(checkDupSql, [username, email], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: "Database error." });
        if (results.length > 0) {
            if (results[0].Username === username) {
                return res.status(400).json({ success: false, field: 'username', message: "Username sudah digunakan." });
            }
            if (results[0].Email === email) {
                return res.status(400).json({ success: false, field: 'email', message: "Email sudah terdaftar." });
            }
        }

        // Jika lolos, generate ID baru dan insert
        const getLastIdQuery = `SELECT User_ID FROM cf_user ORDER BY User_ID DESC LIMIT 1`;
        conn.query(getLastIdQuery, (err, lastIdRes) => {
            let nextIdNumber = 1;
            if (lastIdRes.length > 0) {
                nextIdNumber = parseInt(lastIdRes[0].User_ID.replace("USR", ""), 10) + 1;
            }
            const newUserId = "USR" + String(nextIdNumber).padStart(3, "0");

            const insertQuery = `INSERT INTO cf_user (User_ID, Username, Email, Password, Phone, ID_Role, Account_Status) VALUES (?, ?, ?, ?, ?, 'R04', 'Pending')`;
            conn.query(insertQuery, [newUserId, username, email, password, phone], (err, insertRes) => {
                if (err) return res.status(500).json({ success: false, message: "Gagal menyimpan pendaftaran." });
                res.status(201).json({ success: true, message: "Pendaftaran berhasil! Akun Anda akan segera diaktifkan oleh Manajer." });
            });
        });
    });
});

// 3. API untuk manajer melihat user yang 'Pending'
app.get('/api/users/pending', checkAuth, (req, res) => {
    if (req.session.user.ID_Role !== 'R01') {
        return res.status(403).json({ message: 'Akses ditolak.' });
    }
    const sql = "SELECT User_ID, Username, Email, Phone FROM cf_user WHERE Account_Status = 'Pending'";
    conn.query(sql, (err, results) => {
        if (err) return res.status(500).json([]);
        res.json(results);
    });
});

// 4. API untuk manajer menyetujui (approve) user
app.put('/api/users/approve/:userId', checkAuth, (req, res) => {
    if (req.session.user.ID_Role !== 'R01') {
        return res.status(403).json({ message: 'Akses ditolak.' });
    }
    const { userId } = req.params;
    const sql = "UPDATE cf_user SET Account_Status = 'Aktif' WHERE User_ID = ? AND Account_Status = 'Pending'";
    conn.query(sql, [userId], (err, result) => {
        if (err) return res.status(500).json({ message: 'Database error.' });
        if (result.affectedRows === 0) return res.status(404).json({ message: 'User tidak ditemukan atau sudah aktif.' });
        res.json({ message: `User ${userId} berhasil diaktifkan!` });
    });
});

// 5. Modifikasi sedikit di API GET /api/user/read
// Ganti query SQL-nya agar menyertakan status akun
app.get('/api/user/read', (req, res) => {
    if (!req.session.user || req.session.user.ID_Role !== 'R01') {
        return res.status(401).json({ message: 'Akses Ditolak!' });
    }
    const sqlRead = `
        SELECT 
            U.User_ID, U.Username, U.Email, U.Phone, U.ID_Role, R.RoleName, U.Account_Status
        FROM cf_user AS U
        JOIN cf_roles AS R ON U.ID_Role = R.ID_Role
    `;
    conn.query(sqlRead, (err, results) => {
        if (err) return res.status(500).json({ message: 'Database Error' });
        res.json(results);
    });
});

// POST tambah item ke keranjang
app.post('/api/cart/add', checkAuth, (req, res) => {
    const { productId, quantity } = req.body;
    const userId = req.session.user.User_ID;
    const cartId = "C" + uuidv4().substring(0, 18); // Generate ID unik

    // Cek dulu apakah item sudah ada di keranjang
    const checkSql = "SELECT * FROM cf_carts WHERE User_ID = ? AND ID_Product = ?";
    conn.query(checkSql, [userId, productId], (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error' });

        if (results.length > 0) {
            // Jika sudah ada, update jumlahnya
            const updateSql = "UPDATE cf_carts SET Jumlah = Jumlah + ? WHERE Carts_ID = ?";
            conn.query(updateSql, [quantity, results[0].Carts_ID], (errUpdate) => {
                if (errUpdate) return res.status(500).json({ message: 'Gagal update keranjang' });
                res.json({ message: 'Jumlah item di keranjang diupdate!' });
            });
        } else {
            // Jika belum ada, insert baru
            const insertSql = "INSERT INTO cf_carts (Carts_ID, User_ID, ID_Product, Jumlah) VALUES (?, ?, ?, ?)";
            conn.query(insertSql, [cartId, userId, productId, quantity], (errInsert) => {
                if (errInsert) return res.status(500).json({ message: 'Gagal menambah ke keranjang' });
                res.json({ message: 'Produk ditambahkan ke keranjang!' });
            });
        }
    });
});

// PUT update kuantitas item di keranjang
app.put('/api/cart/update/:cartId', checkAuth, (req, res) => {
    const { cartId } = req.params;
    const { quantity } = req.body;
    const sql = "UPDATE cf_carts SET Jumlah = ? WHERE Carts_ID = ? AND User_ID = ?";
    conn.query(sql, [quantity, cartId, req.session.user.User_ID], (err) => {
        if(err) return res.status(500).json({ message: 'Gagal update' });
        res.json({ message: 'Kuantitas diupdate' });
    });
});

// DELETE item dari keranjang
app.delete('/api/cart/remove/:cartId', checkAuth, (req, res) => {
    const { cartId } = req.params;
    const sql = "DELETE FROM cf_carts WHERE Carts_ID = ? AND User_ID = ?";
    conn.query(sql, [cartId, req.session.user.User_ID], (err) => {
        if(err) return res.status(500).json({ message: 'Gagal hapus' });
        res.json({ message: 'Item dihapus dari keranjang' });
    });
});

// POST proses checkout
app.post('/api/checkout', checkAuth, (req, res) => {
    const userId = req.session.user.User_ID;
    const { address, paymentMethod } = req.body;

    if (!paymentMethod) {
        return res.status(400).json({ message: 'Metode pembayaran wajib dipilih.' });
    }

    // 1. "Pinjam" koneksi dari kolam
    conn.getConnection((err, connection) => {
        if (err) {
            console.error('Gagal dapat koneksi dari pool:', err);
            return res.status(500).json({ message: 'Gagal mendapatkan koneksi' });
        }

        // 2. Mulai transaksi dengan 'connection'
        connection.beginTransaction(err => {
            if (err) {
                connection.release(); // 3. Selalu 'release'
                return res.status(500).json({ message: 'Gagal memulai transaksi' });
            }

            const getCartSql = "SELECT c.Jumlah, p.ID_Product, p.Product_Name, p.Price, p.Stock FROM cf_carts c JOIN cf_products p ON c.ID_Product = p.ID_Product WHERE c.User_ID = ?";
            
            connection.query(getCartSql, [userId], (err, cartItems) => {
                if (err) { return connection.rollback(() => { connection.release(); res.status(500).json({ message: 'Gagal mengambil keranjang' }); }); }
                if (cartItems.length === 0) { return connection.rollback(() => { connection.release(); res.status(400).json({ message: 'Keranjang kosong' }); }); }

                let totalHarga = 0;
                for(const item of cartItems) {
                    if (item.Jumlah > item.Stock) {
                        return connection.rollback(() => { connection.release(); res.status(400).json({ message: `Stok produk tidak mencukupi untuk ${item.Product_Name}`}); });
                    }
                    totalHarga += item.Jumlah * item.Price;
                }

                const getLastOrderIdSql = "SELECT Order_ID FROM cf_order ORDER BY Order_ID DESC LIMIT 1";
                connection.query(getLastOrderIdSql, (err, lastIdResult) => {
                    if (err) { return connection.rollback(() => { connection.release(); res.status(500).json({ message: 'Gagal saat generate Order ID' }); }); }

                    let nextOrderNumber = 1;
                    if (lastIdResult.length > 0) {
                        nextOrderNumber = parseInt(lastIdResult[0].Order_ID.replace('O', ''), 10) + 1;
                    }
                    const orderId = 'O' + String(nextOrderNumber).padStart(3, '0');

                    const insertOrderSql = "INSERT INTO cf_order (Order_ID, User_ID, Total_Harga, Payment_Status, Alamat) VALUES (?, ?, ?, 'Belum Bayar', ?)";
                    connection.query(insertOrderSql, [orderId, userId, totalHarga, address], (err, orderResult) => {
                        if (err) { return connection.rollback(() => { connection.release(); res.status(500).json({ message: 'Gagal membuat order' }); }); }

                        const orderDetailsValues = cartItems.map(item => 
                            ['D' + uuidv4().substring(0, 18), orderId, item.ID_Product, item.Jumlah, item.Price, item.Jumlah * item.Price]
                        );
                        const insertDetailsSql = "INSERT INTO cf_orderdetails (Details_ID, Order_ID, ID_Product, Jumlah, Harga_Satuan, Subtotal) VALUES ?";
                        
                        connection.query(insertDetailsSql, [orderDetailsValues], (err, detailsResult) => {
                            if (err) { console.error(err); return connection.rollback(() => { connection.release(); res.status(500).json({ message: 'Gagal menyimpan detail order' }); }); }

                            const getLastTransactionIdSql = "SELECT Transaction_ID FROM cf_transaction ORDER BY Transaction_ID DESC LIMIT 1";
                            connection.query(getLastTransactionIdSql, (err, lastTransIdResult) => {
                                if (err) { return connection.rollback(() => { connection.release(); res.status(500).json({ message: 'Gagal saat generate Transaction ID' }); }); }

                                let nextTransNumber = 1;
                                if (lastTransIdResult.length > 0) {
                                    nextTransNumber = parseInt(lastTransIdResult[0].Transaction_ID.replace('T', ''), 10) + 1;
                                }
                                const transactionId = 'T' + String(nextTransNumber).padStart(3, '0');
                                
                                const insertTransactionSql = "INSERT INTO cf_transaction (Transaction_ID, Order_ID, Total_Payment, Payment_Method) VALUES (?, ?, ?, ?)";
                                connection.query(insertTransactionSql, [transactionId, orderId, totalHarga, paymentMethod], (err, transResult) => {
                                    if (err) { return connection.rollback(() => { connection.release(); res.status(500).json({ message: 'Gagal membuat transaksi' }); }); }
                                    
                                    const clearCartSql = "DELETE FROM cf_carts WHERE User_ID = ?";
                                    connection.query(clearCartSql, [userId], (err, clearResult) => {
                                        if (err) { return connection.rollback(() => { connection.release(); res.status(500).json({ message: 'Gagal mengosongkan keranjang' }); }); }

                                        let updateStockPromises = cartItems.map(item => {
                                            return new Promise((resolve, reject) => {
                                                const updateStockSql = "UPDATE cf_products SET Stock = Stock - ? WHERE ID_Product = ?";
                                                connection.query(updateStockSql, [item.Jumlah, item.ID_Product], (err, result) => {
                                                    if (err) return reject(err);
                                                    resolve(result);
                                                });
                                            });
                                        });

                                        Promise.all(updateStockPromises).then(() => {
                                            // 4. Commit jika semua sukses
                                            connection.commit(err => {
                                                if (err) { return connection.rollback(() => { connection.release(); res.status(500).json({ message: 'Gagal commit transaksi' }); }); }
                                                
                                                // 5. SUKSES! Kembalikan koneksi
                                                connection.release();
                                                res.json({ success: true, message: 'Checkout berhasil! Silakan lakukan pembayaran.' });
                                            });
                                        }).catch(err => {
                                            connection.rollback(() => { connection.release(); res.status(500).json({ message: 'Gagal update stok produk' }); });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

// GET riwayat pesanan user
app.get('/api/orders/history', checkAuth, (req, res) => {
    const userId = req.session.user.User_ID;
    const sql = "SELECT * FROM cf_order WHERE User_ID = ? ORDER BY Order_Date DESC";
    conn.query(sql, [userId], (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json(results);
    });
});


// ==========================================================
// API UNTUK FINANCE - R03
// ==========================================================
app.get('/api/transactions', checkAuth, (req, res) => {
    // Otorisasi: Hanya R03 (Finance) atau R01 (Manager) yang boleh akses
    if (req.session.user.ID_Role !== 'R03' && req.session.user.ID_Role !== 'R01') {
        return res.status(403).json({ message: 'Akses ditolak.' });
    }

    let { status } = req.query;
    let sql = `
        SELECT t.*, u.Username
        FROM cf_transaction t
        JOIN cf_order o ON t.Order_ID = o.Order_ID
        JOIN cf_user u ON o.User_ID = u.User_ID
    `;
    const params = [];

    if (status && status !== 'Semua') {
        sql += ' WHERE t.Payment_Status = ?';
        params.push(status);
    }
    sql += ' ORDER BY t.Payment_Date DESC';

    conn.query(sql, params, (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json(results);
    });
});

app.put('/api/transactions/update/:transactionId', checkAuth, (req, res) => {
    if (req.session.user.ID_Role !== 'R03' && req.session.user.ID_Role !== 'R01') {
        return res.status(403).json({ message: 'Akses ditolak.' });
    }

    const { transactionId } = req.params;
    const { status } = req.body; // 'Berhasil' atau 'Gagal'

    // 1. "Pinjam" koneksi dari kolam (conn sekarang adalah pool)
    conn.getConnection((err, connection) => {
        if (err) {
            console.error('Gagal dapat koneksi dari pool:', err);
            return res.status(500).json({ message: 'Gagal mendapatkan koneksi' });
        }

        // 2. Mulai transaksi dengan 'connection' (bukan 'conn' lagi)
        connection.beginTransaction(err => {
            if (err) {
                connection.release(); // 3. Selalu 'release' jika error
                return res.status(500).json({ message: 'Gagal memulai transaksi' });
            }

            const updateTransactionSql = "UPDATE cf_transaction SET Payment_Status = ? WHERE Transaction_ID = ?";
            connection.query(updateTransactionSql, [status, transactionId], (err, result) => {
                if (err || result.affectedRows === 0) {
                    // 3. Rollback dan release
                    return connection.rollback(() => {
                        connection.release();
                        res.status(500).json({ message: 'Gagal update status transaksi.' });
                    });
                }

                const getOrderSql = "SELECT Order_ID FROM cf_transaction WHERE Transaction_ID = ?";
                connection.query(getOrderSql, [transactionId], (err, transactions) => {
                    if (err || transactions.length === 0) {
                        // 3. Rollback dan release
                        return connection.rollback(() => {
                            connection.release();
                            res.status(500).json({ message: 'Gagal menemukan order terkait.' });
                        });
                    }

                    const orderId = transactions[0].Order_ID;
                    const newOrderStatus = status === 'Berhasil' ? 'Sudah Bayar' : 'Belum Bayar';

                    const updateOrderSql = "UPDATE cf_order SET Payment_Status = ? WHERE Order_ID = ?";
                    connection.query(updateOrderSql, [newOrderStatus, orderId], (err, orderResult) => {
                        if (err) {
                            // 3. Rollback dan release
                            return connection.rollback(() => {
                                connection.release();
                                res.status(500).json({ message: 'Gagal update status order.' });
                            });
                        }

                        // 4. Jika semua query sukses, commit
                        connection.commit(err => {
                            if (err) {
                                // 3. Rollback dan release
                                return connection.rollback(() => {
                                    connection.release();
                                    res.status(500).json({ message: 'Gagal commit transaksi.' });
                                });
                            }
                            
                            // 5. SUKSES! Kembalikan koneksi ke kolam
                            connection.release();
                            res.json({ message: `Status transaksi berhasil diubah menjadi ${status}` });
                        });
                    });
                });
            });
        });
    });
});

// GET semua order untuk ditampilkan di dashboard staf
app.get('/api/orders', checkAuth, (req, res) => {
    // Hanya Staf (R02) dan Manager (R01) yang boleh akses
    if (req.session.user.ID_Role !== 'R02' && req.session.user.ID_Role !== 'R01') {
        return res.status(403).json({ message: 'Akses ditolak.' });
    }

    let { status } = req.query;
    let sql = `
        SELECT o.*, u.Username 
        FROM cf_order o
        JOIN cf_user u ON o.User_ID = u.User_ID
        WHERE o.Payment_Status = 'Sudah Bayar'
    `;
    const params = [];

    if (status && status !== 'Semua') {
        sql += ' AND o.Order_Status = ?';
        params.push(status);
    }
    sql += ' ORDER BY o.Order_Date DESC';
    
    conn.query(sql, params, (err, results) => {
        if(err) return res.status(500).json({ message: 'Database error' });
        res.json(results);
    });
});

// GET detail spesifik dari satu order
app.get('/api/orders/details/:orderId', checkAuth, (req, res) => {
    if (req.session.user.ID_Role !== 'R02' && req.session.user.ID_Role !== 'R01') {
        return res.status(403).json({ message: 'Akses ditolak.' });
    }

    const { orderId } = req.params;
    const orderInfoSql = `
        SELECT o.*, u.Username FROM cf_order o
        JOIN cf_user u ON o.User_ID = u.User_ID
        WHERE o.Order_ID = ?
    `;
    const orderDetailsSql = `
        SELECT od.Jumlah, p.Product_Name FROM cf_orderdetails od
        JOIN cf_products p ON od.ID_Product = p.ID_Product
        WHERE od.Order_ID = ?
    `;

    conn.query(orderInfoSql, [orderId], (err, orderInfo) => {
        if(err) return res.status(500).json({ message: 'Error mengambil info order' });
        if(orderInfo.length === 0) return res.status(404).json({ message: 'Order tidak ditemukan' });

        conn.query(orderDetailsSql, [orderId], (err, orderDetails) => {
            if(err) return res.status(500).json({ message: 'Error mengambil detail produk' });
            
            res.json({
                orderInfo: orderInfo[0],
                orderDetails: orderDetails
            });
        });
    });
});

// PUT untuk update status order dan nomor resi
app.put('/api/orders/status/:orderId', checkAuth, (req, res) => {
    if (req.session.user.ID_Role !== 'R02' && req.session.user.ID_Role !== 'R01') {
        return res.status(403).json({ message: 'Akses ditolak.' });
    }

    const { orderId } = req.params;
    const { status, resi } = req.body;

    const sql = "UPDATE cf_order SET Order_Status = ?, Nomor_Resi = ? WHERE Order_ID = ?";
    conn.query(sql, [status, resi || null, orderId], (err, result) => {
        if(err) return res.status(500).json({ message: 'Database error' });
        if(result.affectedRows === 0) return res.status(404).json({ message: 'Order tidak ditemukan' });

        res.json({ message: `Status order #${orderId} berhasil diubah menjadi "${status}"` });
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

    // VALIDASI TAMBAHAN (Q3c): Contoh Validasi Panjang Password (jika diisi)
    if (password && password.length < 6) { 
        return res.status(400).json({ message: 'Password minimal 6 karakter.' });
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

// GET Data Laporan Penjualan (Q4a & Q4b - Filter/Search)
app.get('/api/report/sales', (req, res) => {
    // 1. Otorisasi: Hanya R01 (Manager) yang boleh akses
    if (!req.session.user || req.session.user.ID_Role !== 'R01') {
        return res.status(401).json({ message: 'Akses Ditolak! Anda bukan Manager.' });
    }

    // 2. Ambil parameter filter/search dari frontend
    const keyword = req.query.search ? '%' + req.query.search + '%' : null;
    const status = req.query.status; 

    let sql = `
        SELECT 
            O.Order_ID, 
            O.Order_Date, 
            O.Total_Harga, 
            O.Order_Status,
            O.Payment_Status,
            U.Username,
            T.Payment_Method
        FROM 
            cf_order AS O
        JOIN 
            cf_user AS U ON O.User_ID = U.User_ID
        LEFT JOIN 
            cf_transaction AS T ON O.Order_ID = T.Order_ID
        WHERE 1=1 
    `;
    
    const params = [];

    // 3. Tambahkan kondisi filter Status Order
    if (status && status !== 'Semua') {
        sql += ` AND O.Order_Status = ?`;
        params.push(status);
    }
    
    // 4. Tambahkan kondisi Search (ID Order atau Username)
    if (keyword) {
        // Gunakan kurung di SQL agar logika AND/OR benar
        sql += ` AND (O.Order_ID LIKE ? OR U.Username LIKE ?)`; 
        params.push(keyword, keyword);
    }

    sql += ` ORDER BY O.Order_Date DESC`;

    conn.query(sql, params, (err, results) => {
        if (err) {
            console.error('Gagal mengambil data laporan:', err);
            return res.status(500).json({ message: 'Gagal mengambil data laporan' });
        }
        res.status(200).json(results);
    });
});

app.listen(PORT, () => {
    console.log(`Server Running At http://localhost:${PORT}`);
});