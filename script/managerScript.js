const userForm = document.getElementById('userForm');
let users = [];
let products = [];

if (userForm){
    userForm.addEventListener('submit', handleUserSubmit);
}

document.addEventListener('DOMContentLoaded', () => {
    fetch('/user-info') 
        .then(response => response.json())
        .then(data => {
            const welcomeTitle = document.getElementById('welcomeTitle');
            const roleBadge = document.getElementById('roleBadge');

            if (welcomeTitle) {
                welcomeTitle.textContent = `Selamat Datang, ${data.username}!`;
            }
            if (roleBadge) {
                roleBadge.textContent = data.role;
            }
        })
        .catch(err => console.error('Gagal mengambil info user:', err));
});

// Navigation Functions
function showPage(pageId) {
    document.querySelectorAll('.content-area').forEach(area => {
        area.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');

    if (pageId === 'userPage') {
        renderUserTable();
    } else if (pageId === 'productPage') {
        renderProductTable();
    }
}

function goHome() {
    showPage('mainMenu');
}

function toggleDropdown() {
    document.getElementById('dropdown').classList.toggle('active');
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const menuButton = document.querySelector('.menu-button');
    const dropdown = document.getElementById('dropdown');
    
    if (!menuButton.contains(event.target)) {
        dropdown.classList.remove('active');
    }
});

function signOut() {
    if (confirm('Apakah Anda yakin ingin keluar?')) {
        alert('Sign out berhasil! Terima kasih.');
        window.location.href = '/signout';
    }
}

// User Management Functions
function renderUserTable() {
    const tbody = document.getElementById('userTableBody');
    tbody.innerHTML = '<tr><td colspan="7">Memuat data...</td></tr>';

    fetch('/api/user/read')
        .then(response => {
            if (!response.ok) throw new Error('Gagal memuat data user.');
            return response.json();
        })
        .then(usersFromDB => {
            users = usersFromDB; 
            tbody.innerHTML = '';

            users.forEach(user => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${user.User_ID}</td>
                    <td>${user.Username}</td>
                    <td>${user.Email}</td>
                    <td>${user.Phone}</td>
                    <td>${user.RoleName}</td>
                    <td>
                        <div class="action-btns">
                            <button class="btn-edit" onclick="openUserModal('edit', '${user.User_ID}')">✏️ Edit</button>
                            <button class="btn-delete" onclick="deleteUser('${user.User_ID}')">🗑️ Hapus</button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        })
        .catch(error => {
            tbody.innerHTML = `<tr><td colspan="7" style="color:red;">Error: ${error.message}</td></tr>`;
        });
}

function handleUserSubmit(event) {
    event.preventDefault();

    const userId = document.getElementById('userId').value;
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const phone = document.getElementById('Phone').value.trim();
    const role = document.getElementById('Role').value;

    const userData = { username, email, password, phone, role };

    if (userId) {
        // mode edit
        showConfirmModal("Simpan perubahan pada user ini?", "update", () => {
            fetch(`/api/user/update/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            })
            .then(res => res.json())
            .then(data => {
                showNotification('✅ User berhasil diupdate!', 'success');
                closeUserModal();
                renderUserTable();
            })
            .catch(err => showNotification('❌ Gagal update user!', 'error'));
        });
    } else {
        sendUserToAPI(userData);
    }
}

function openUserModal(mode, userId = null) {
    const modal = document.getElementById('userModal');
    const form = document.getElementById('userForm');
    const title = document.getElementById('userModalTitle');
    
    form.reset();
    modal.classList.add('active');

    if (mode === 'add') {
        title.textContent = 'Tambah User Baru';
        document.getElementById('userId').value = '';
        document.getElementById('password').required = true;
        document.getElementById('password').placeholder = 'Minimal 6 karakter';
    } 
    else if (mode === 'edit' && userId) {
        title.textContent = 'Edit User';
        document.getElementById('userId').value = userId;
        document.getElementById('password').placeholder = '(Kosongkan jika tidak ubah password)';
        document.getElementById('password').required = false;

        // cari user dari array users global
        const user = users.find(u => u.User_ID === userId);
        if (user) {
            document.getElementById('username').value = user.Username || '';
            document.getElementById('email').value = user.Email || '';
            document.getElementById('Phone').value = user.Phone || '';

            // jika backend sudah kirim ID_Role, langsung pakai:
            if (user.ID_Role) {
                document.getElementById('Role').value = user.ID_Role;
            } 
            // fallback kalau hanya RoleName yang dikirim
            else {
                const roleMap = {
                    "Manager Katalog": "R01",
                    "Staf Proses Pesanan": "R02",
                    "Finance Coordinator": "R03",
                    "User": "R04"
                };
                document.getElementById('Role').value = roleMap[user.RoleName] || 'R04';
            }
        } else {
            console.warn('User tidak ditemukan untuk ID:', userId);
        }
    }
}

function closeUserModal() {
    document.getElementById('userModal').classList.remove('active');
}

function editUser(userId) {
    openUserModal('edit', userId);
}

function deleteUser(userId) {
    showConfirmModal("Apakah Anda yakin ingin menghapus user ini?", "delete", () => {
        fetch(`/api/user/delete/${userId}`, { method: 'DELETE' })
            .then(res => res.json())
            .then(data => {
                showNotification('✅ User berhasil dihapus!', 'success');
                renderUserTable();
            })
            .catch(err => {
                console.error(err);
                showNotification('❌ Gagal menghapus user!', 'error');
            });
    });
}

// Product Management Functions
function renderProductTable() {
    const tbody = document.getElementById('productTableBody');
    tbody.innerHTML = '<tr><td colspan="7">Memuat data...</td></tr>';

    fetch('/api/product/read')
        .then(response => {
            if (!response.ok) throw new Error('Gagal memuat data produk.');
            return response.json();
        })
        .then(productsFromDB => {
            products = productsFromDB; // ✅ simpan data produk ke global
            tbody.innerHTML = '';

            products.forEach(product => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${product.ID_Product}</td>
                    <td>${product.Product_Name}</td>
                    <td>Rp ${parseFloat(product.Price).toLocaleString('id-ID')}</td>
                    <td>${product.Stock}</td>
                    <td><span class="status-badge ${product.Status === 'Aktif' ? 'status-active' : 'status-inactive'}">${product.Status}</span></td>
                    <td>${product.Description || '-'}</td>
                    <td>
                        <div class="action-btns">
                            <button class="btn-edit" onclick="openProductModal('edit', '${product.ID_Product}')">✏️ Edit</button>
                            <button class="btn-delete" onclick="deleteProduct('${product.ID_Product}')">🗑️ Hapus</button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        })
        .catch(err => {
            console.error(err);
            tbody.innerHTML = `<tr><td colspan="7" style="color:red;">Gagal memuat produk.</td></tr>`;
        });
}

// Fitur pencarian produk untuk manager
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('managerSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const keyword = this.value.toLowerCase();
            const rows = document.querySelectorAll('#productTableBody tr');

            rows.forEach(row => {
                const id = row.children[0]?.textContent.toLowerCase() || '';
                const name = row.children[1]?.textContent.toLowerCase() || '';
                if (id.includes(keyword) || name.includes(keyword)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }
});

document.getElementById('managerSearchInput').value = '';
document.getElementById('staffSearchInput').value = '';

function openProductModal(mode, productId = null) {
    const modal = document.getElementById('productModal');
    const form = document.getElementById('productForm');
    const title = document.getElementById('productModalTitle');
    
    form.reset(); // kosongkan form setiap kali dibuka
    modal.classList.add('active');

    if (mode === 'add') {
        // TAMBAH PRODUK BARU
        title.textContent = 'Tambah Produk Baru';
        document.getElementById('productId').value = '';
        document.getElementById('productCode').value = '';
    } 
    else if (mode === 'edit' && productId) {
        // EDIT PRODUK
        title.textContent = 'Edit Produk';
        document.getElementById('productId').value = productId;

        // cari produk dari array global
        const product = products.find(p => p.ID_Product === productId);
        if (product) {
            document.getElementById('productCode').value = product.ID_Product || '';
            document.getElementById('productName').value = product.Product_Name || '';
            document.getElementById('price').value = product.Price || 0;
            document.getElementById('stock').value = product.Stock || 0;
            document.getElementById('description').value = product.Description || '';
            document.getElementById('productStatus').value = product.Status || 'Aktif';
        } else {
            console.warn('Produk tidak ditemukan untuk ID:', productId);
        }
    }
}


function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
}

function handleProductSubmit(event) {
    event.preventDefault();

    const productId = document.getElementById('productId').value; // hidden input (untuk edit)
    const idInput = document.getElementById('productCode').value.trim(); // input opsional

    const productData = {
        id: idInput, // bisa kosong
        name: document.getElementById('productName').value.trim(),
        price: parseFloat(document.getElementById('price').value),
        stock: parseInt(document.getElementById('stock').value),
        description: document.getElementById('description').value.trim(),
        status: document.getElementById('productStatus').value
    };

    if (productId) {
        // UPDATE
        fetch(`/api/product/update/${productId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData)
        })
        .then(res => res.json())
        .then(data => {
            showNotification('✅ Produk berhasil diupdate!', 'success');
            closeProductModal();
            renderProductTable();
        })
        .catch(err => showNotification('❌ Gagal mengupdate produk!', 'error'));
    } else {
        // ADD
        fetch('/api/product/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData)
        })
        .then(res => res.json())
        .then(data => {
            showNotification(data.message || '✅ Produk berhasil ditambahkan!', 'success');
            closeProductModal();
            renderProductTable();
        })
        .catch(err => showNotification('❌ Gagal menambahkan produk!', 'error'));
    }
}


function editProduct(productId) {
    openProductModal('edit', productId);
}

function deleteProduct(productId) {
    showConfirmModal("Apakah Anda yakin ingin menghapus produk ini?", "delete", () => {
        fetch(`/api/product/delete/${productId}`, { method: 'DELETE' })
            .then(res => res.json())
            .then(data => {
                showNotification('✅ Produk berhasil dihapus!', 'success');
                renderProductTable();
            })
            .catch(err => showNotification('❌ Gagal menghapus produk!', 'error'));
    });
}


function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
}

// Notification function for better UX
function showNotification(message, type = 'success') {
    // Remove existing notification if any
    const existingNotif = document.querySelector('.toast-notification');
    if (existingNotif) {
        existingNotif.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `toast-notification ${type}`;
    notification.textContent = message;
    
    // Add to body
    document.body.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

function showConfirmModal(message, type = "default", onConfirm) {
    const modal = document.getElementById("confirmModal");
    const messageBox = document.getElementById("confirmMessage");
    const confirmBtn = document.getElementById("confirmYesBtn");
    const title = document.getElementById("confirmTitle");

    // Isi teks
    messageBox.textContent = message;
    title.textContent = type === "delete" ? "Hapus Data" : "Konfirmasi Aksi";

    // Ganti warna tombol sesuai tipe
    confirmBtn.className = "btn-submit";
    if (type === "delete") confirmBtn.classList.add("btn-confirm-delete");
    else if (type === "update") confirmBtn.classList.add("btn-confirm-update");

    // Tampilkan modal
    modal.classList.add("active");

    // Hapus event lama biar tidak dobel
    const newBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);

    // Tambahkan event baru
    newBtn.addEventListener("click", () => {
        closeConfirmModal();
        if (onConfirm) onConfirm();
    });
}

function closeConfirmModal() {
    document.getElementById("confirmModal").classList.remove("active");
}


// Initialize tables on page load
document.addEventListener('DOMContentLoaded', function() {
    renderUserTable();
    renderProductTable();
});