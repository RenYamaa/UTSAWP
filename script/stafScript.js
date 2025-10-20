document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
});

function loadProducts() {
    const tbody = document.getElementById('productTableBody');
    tbody.innerHTML = '<tr><td colspan="6">Memuat data...</td></tr>';

    fetch('/api/staff/products')
        .then(res => res.json())
        .then(products => {
            tbody.innerHTML = '';
            products.forEach(prod => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${prod.ID_Product}</td>
                    <td>${prod.Product_Name}</td>
                    <td>Rp ${parseInt(prod.Price).toLocaleString('id-ID')}</td>
                    <td>
                        <input type="number" value="${prod.Stock}" min="0" class="stock-input" 
                            onchange="updateProduct('${prod.ID_Product}', this.value, null)">
                    </td>
                    <td>
                        <select class="status-select" onchange="updateProduct('${prod.ID_Product}', null, this.value)">
                            <option value="Aktif" ${prod.Status === 'Aktif' ? 'selected' : ''}>Aktif</option>
                            <option value="Tidak Aktif" ${prod.Status === 'Tidak Aktif' ? 'selected' : ''}>Tidak Aktif</option>
                        </select>
                    </td>
                    <td>${prod.Description || '-'}</td>
                `;
                tbody.appendChild(tr);
            });
        })
        .catch(err => {
            console.error('Gagal memuat data:', err);
            tbody.innerHTML = '<tr><td colspan="6" style="color:red;">Gagal memuat data produk.</td></tr>';
        });
}

function updateProduct(productId, newStock = null, newStatus = null) {
    const body = {};
    if (newStock !== null) body.stock = parseInt(newStock);
    if (newStatus !== null) body.status = newStatus;

    fetch(`/api/staff/update/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })
    .then(res => res.json())
    .then(data => {
        showNotification(data.message, 'success');
    })
    .catch(err => {
        console.error(err);
        showNotification('❌ Gagal memperbarui produk!', 'error');
    });
}

function showNotification(message, type = 'success') {
    const notif = document.createElement('div');
    notif.className = `toast-notification ${type}`;
    notif.textContent = message;
    document.body.appendChild(notif);

    setTimeout(() => notif.classList.add('show'), 10);
    setTimeout(() => notif.remove(), 3000);
}

// === Dropdown Menu (versi staf) ===
function toggleDropdown() {
    const dropdown = document.getElementById('dropdownMenu'); 
    dropdown.classList.toggle('active');
}

// Tutup dropdown jika klik di luar menu
document.addEventListener('click', function(event) {
    const menuButton = document.querySelector('.btn-menu');   
    const dropdown = document.getElementById('dropdownMenu');
    if (!menuButton.contains(event.target)) {
        dropdown.classList.remove('active');
    }
});

// === Sign Out Function ===
function signOut() {
    if (confirm('Apakah Anda yakin ingin keluar?')) {
        alert('Sign out berhasil! Terima kasih.');
        window.location.href = '/signout';
    }
}

// Fitur pencarian produk untuk staf
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('staffSearchInput');
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
