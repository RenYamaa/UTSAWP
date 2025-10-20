document.addEventListener('DOMContentLoaded', () => {
    fetchUserInfo();
    loadProducts();
    updateCartCount();

    document.getElementById('cartBtn').addEventListener('click', openCartModal);
    document.getElementById('historyBtn').addEventListener('click', openHistoryModal);
    document.getElementById('checkoutBtn').addEventListener('click', handleCheckout);
});

// Fungsi untuk sign out (bisa digabung jika ada file js global)
function signOut() {
    if (confirm('Apakah Anda yakin ingin keluar?')) {
        window.location.href = '/signout';
    }
}

// Mengambil info user dan menampilkan nama
function fetchUserInfo() {
    fetch('/user-info')
        .then(res => res.json())
        .then(data => {
            if (data.username) {
                document.getElementById('welcomeMessage').textContent = `Halo, ${data.username}!`;
            }
        })
        .catch(err => console.error('Gagal mengambil info user:', err));
}

// Memuat semua produk aktif
function loadProducts() {
    const grid = document.getElementById('productGrid');
    grid.innerHTML = '<p>Memuat produk...</p>';

    fetch('/api/products/active')
        .then(response => response.json())
        .then(products => {
            grid.innerHTML = '';
            if (products.length === 0) {
                grid.innerHTML = '<p>Belum ada produk yang tersedia saat ini.</p>';
                return;
            }
            products.forEach(product => {
                const card = document.createElement('div');
                card.className = 'product-card';
                card.innerHTML = `
                    <div class="product-image-placeholder"></div>
                    <div class="product-info">
                        <h3 class="product-name">${product.Product_Name}</h3>
                        <p class="product-price">Rp ${parseInt(product.Price).toLocaleString('id-ID')}</p>
                        <p class="product-stock">Stok: ${product.Stock}</p>
                    </div>
                    <button class="btn-add-cart" onclick="addToCart('${product.ID_Product}')" ${product.Stock === 0 ? 'disabled' : ''}>
                        ${product.Stock === 0 ? 'Stok Habis' : '➕ Tambah ke Keranjang'}
                    </button>
                `;
                grid.appendChild(card);
            });
        })
        .catch(err => {
            grid.innerHTML = '<p style="color:red;">Gagal memuat produk. Coba lagi nanti.</p>';
            console.error(err);
        });
}

// Menambah produk ke keranjang
function addToCart(productId) {
    fetch('/api/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: productId, quantity: 1 })
    })
    .then(res => res.json())
    .then(data => {
        showNotification(data.message, 'success');
        updateCartCount();
    })
    .catch(err => {
        showNotification('Gagal menambahkan ke keranjang!', 'error');
        console.error(err);
    });
}

// Update jumlah item di ikon keranjang
function updateCartCount() {
    fetch('/api/cart')
        .then(res => res.json())
        .then(cartItems => {
            document.getElementById('cartCount').textContent = cartItems.length;
        });
}

// Membuka modal keranjang
function openCartModal() {
    const modal = document.getElementById('cartModal');
    const container = document.getElementById('cartItemsContainer');
    container.innerHTML = 'Memuat keranjang...';
    modal.classList.add('active');

    fetch('/api/cart')
        .then(res => res.json())
        .then(items => {
            renderCartItems(items);
        });
}

// Merender item di dalam modal keranjang
function renderCartItems(items) {
    const container = document.getElementById('cartItemsContainer');
    const totalEl = document.getElementById('cartTotal');
    const checkoutBtn = document.getElementById('checkoutBtn');
    
    container.innerHTML = '';
    if (items.length === 0) {
        container.innerHTML = '<p>Keranjang Anda kosong.</p>';
        totalEl.textContent = 'Rp 0';
        checkoutBtn.disabled = true;
        return;
    }
    
    checkoutBtn.disabled = false;
    let totalPrice = 0;

    items.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'cart-item';
        const subtotal = item.Jumlah * item.Price;
        totalPrice += subtotal;

        itemEl.innerHTML = `
            <div class="cart-item-info">
                <strong>${item.Product_Name}</strong>
                <span>Rp ${parseInt(item.Price).toLocaleString('id-ID')}</span>
            </div>
            <div class="cart-item-actions">
                <input type="number" value="${item.Jumlah}" min="1" max="${item.Stock}" class="item-quantity" onchange="updateCartItem('${item.Carts_ID}', this.value)">
                <span>Subtotal: Rp ${subtotal.toLocaleString('id-ID')}</span>
                <button class="btn-remove" onclick="removeFromCart('${item.Carts_ID}')">Hapus</button>
            </div>
        `;
        container.appendChild(itemEl);
    });

    totalEl.textContent = `Rp ${totalPrice.toLocaleString('id-ID')}`;
}

function closeCartModal() {
    document.getElementById('cartModal').classList.remove('active');
}

// Update kuantitas item
function updateCartItem(cartId, quantity) {
    fetch(`/api/cart/update/${cartId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: parseInt(quantity) })
    })
    .then(res => res.json())
    .then(data => {
        openCartModal(); // Refresh cart view
    });
}

// Hapus item dari keranjang
function removeFromCart(cartId) {
    if (!confirm('Hapus item ini dari keranjang?')) return;
    fetch(`/api/cart/remove/${cartId}`, { method: 'DELETE' })
    .then(res => res.json())
    .then(data => {
        showNotification(data.message, 'success');
        openCartModal(); // Refresh cart view
        updateCartCount();
    });
}

// Proses checkout
// GANTI FUNGSI HANDLECHECKOUT LAMA DENGAN SEMUA KODE DI BAWAH INI

// 1. Fungsi ini sekarang membuka modal checkout, bukan langsung proses
function openCheckoutModal() {
    closeCartModal(); // Tutup dulu modal keranjang
    document.getElementById('checkoutModal').classList.add('active');
}

function closeCheckoutModal() {
    document.getElementById('checkoutModal').classList.remove('active');
}

// 2. Ganti event listener tombol checkout di keranjang
document.removeEventListener('click', handleCheckout); // Hapus listener lama
document.getElementById('checkoutBtn').addEventListener('click', openCheckoutModal);

// 3. Tambahkan event listener untuk form checkout yang baru
const checkoutForm = document.getElementById('checkoutForm');
checkoutForm.addEventListener('submit', handleCheckout);

// 4. Ini adalah fungsi checkout yang baru dan sesungguhnya
function handleCheckout(event) {
    event.preventDefault(); // Mencegah form reload halaman

    const address = document.getElementById('shippingAddress').value.trim();
    const selectedPayment = document.querySelector('input[name="payment"]:checked');

    if (!address) {
        alert("Alamat pengiriman wajib diisi!");
        return;
    }
    if (!selectedPayment) {
        alert("Silakan pilih metode pembayaran!");
        return;
    }

    const paymentMethod = selectedPayment.value;

    fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: address, paymentMethod: paymentMethod })
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message);
        if(data.success) {
            closeCheckoutModal();
            updateCartCount();
        }
    })
    .catch(err => {
        alert('Terjadi kesalahan saat checkout.');
        console.error(err);
    });
}

// --- Riwayat Pesanan ---
function openHistoryModal() {
    const modal = document.getElementById('historyModal');
    const container = document.getElementById('historyItemsContainer');
    container.innerHTML = 'Memuat riwayat...';
    modal.classList.add('active');

    fetch('/api/orders/history')
        .then(res => res.json())
        .then(orders => {
            container.innerHTML = '';
            if (orders.length === 0) {
                container.innerHTML = '<p>Anda belum memiliki riwayat pesanan.</p>';
                return;
            }
            orders.forEach(order => {
                const orderEl = document.createElement('div');
                orderEl.className = 'history-item';

                // --- PENAMBAHAN LOGIKA UNTUK MENAMPILKAN RESI ---
                let resiHtml = '';
                // Cek apakah statusnya 'Dikirim' DAN ada nomor resi
                if (order.Order_Status === 'Dikirim' && order.Nomor_Resi) {
                    resiHtml = `
                        <div class="history-item-resi">
                            <strong>No. Resi Pengiriman:</strong> <span>${order.Nomor_Resi}</span>
                        </div>`;
                }
                // --- AKHIR PENAMBAHAN LOGIKA ---

                orderEl.innerHTML = `
                    <div class="history-item-header">
                        <strong>Order ID: ${order.Order_ID}</strong>
                        <span>${new Date(order.Order_Date).toLocaleDateString('id-ID')}</span>
                    </div>
                    <div class="history-item-body">
                        <span>Total: Rp ${parseInt(order.Total_Harga).toLocaleString('id-ID')}</span>
                        <span>Status Bayar: ${order.Payment_Status}</span>
                        <span>Status Pesanan: <b class="status-${order.Order_Status.toLowerCase()}">${order.Order_Status}</b></span>
                    </div>
                    ${resiHtml} 
                `;
                container.appendChild(orderEl);
            });
        });
}

function closeHistoryModal() {
    document.getElementById('historyModal').classList.remove('active');
}

// --- Notifikasi ---
function showNotification(message, type = 'success') {
    const existingNotif = document.querySelector('.toast-notification');
    if (existingNotif) existingNotif.remove();
    
    const notification = document.createElement('div');
    notification.className = `toast-notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// --- Logika untuk Hamburger Menu ---
document.addEventListener('DOMContentLoaded', () => {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const navLinks = document.getElementById('navLinks');

    if (hamburgerBtn && navLinks) {
        hamburgerBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });

        // Optional: Tutup menu jika klik di luar area menu
        document.addEventListener('click', (event) => {
            const isClickInsideMenu = navLinks.contains(event.target);
            const isClickOnHamburger = hamburgerBtn.contains(event.target);

            if (!isClickInsideMenu && !isClickOnHamburger) {
                navLinks.classList.remove('active');
            }
        });
    }
});