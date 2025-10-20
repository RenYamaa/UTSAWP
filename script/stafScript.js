document.addEventListener('DOMContentLoaded', () => {
    fetchUserInfo();
    loadOrders();

    document.getElementById('statusFilter').addEventListener('change', loadOrders);
});

function signOut() {
    if (confirm('Apakah Anda yakin ingin keluar?')) {
        window.location.href = '/signout';
    }
}

function fetchUserInfo() {
    fetch('/user-info')
        .then(res => res.json())
        .then(data => {
            if (data.username) {
                document.getElementById('welcomeMessage').textContent = `Halo, ${data.username}!`;
            }
        });
}

function loadOrders() {
    const tbody = document.getElementById('orderTableBody');
    const statusFilter = document.getElementById('statusFilter').value;
    tbody.innerHTML = '<tr><td colspan="7">Memuat data pesanan...</td></tr>';

    fetch(`/api/orders?status=${statusFilter}`)
        .then(res => res.json())
        .then(orders => {
            tbody.innerHTML = '';
            if (orders.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7">Tidak ada pesanan yang sesuai.</td></tr>';
                return;
            }
            orders.forEach(order => {
                const tr = document.createElement('tr');
                const totalHarga = parseInt(order.Total_Harga).toLocaleString('id-ID');
                tr.innerHTML = `
                    <td><strong>${order.Order_ID}</strong></td>
                    <td>${order.Username}</td>
                    <td>${new Date(order.Order_Date).toLocaleDateString('id-ID')}</td>
                    <td>Rp ${totalHarga}</td>
                    <td><span class="status-badge pay-${order.Payment_Status.replace(' ', '').toLowerCase()}">${order.Payment_Status}</span></td>
                    <td><span class="status-badge status-${order.Order_Status.toLowerCase()}">${order.Order_Status}</span></td>
                    <td>
                        <button class="btn-action btn-view" onclick="openDetailModal('${order.Order_ID}')">Lihat Detail</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        });
}

function openDetailModal(orderId) {
    const modal = document.getElementById('detailModal');
    const modalBody = document.getElementById('modalBody');
    document.getElementById('modalOrderId').textContent = `Detail Pesanan #${orderId}`;
    modalBody.innerHTML = '<p>Memuat detail...</p>';
    modal.classList.add('active');

    fetch(`/api/orders/details/${orderId}`)
        .then(res => res.json())
        .then(data => {
            const { orderInfo, orderDetails } = data;
            
            let productsHtml = '<h4>Produk yang Dipesan:</h4><ul class="product-list">';
            orderDetails.forEach(item => {
                productsHtml += `<li>${item.Product_Name} <span>(Qty: ${item.Jumlah})</span></li>`;
            });
            productsHtml += '</ul>';

            modalBody.innerHTML = `
                <div class="detail-grid">
                    <div><strong>Username:</strong> ${orderInfo.Username}</div>
                    <div><strong>Tanggal:</strong> ${new Date(orderInfo.Order_Date).toLocaleString('id-ID')}</div>
                    <div><strong>Alamat Kirim:</strong> ${orderInfo.Alamat || '-'}</div>
                    <div><strong>Nomor Resi:</strong> <span id="resiText">${orderInfo.Nomor_Resi || 'Belum ada'}</span></div>
                </div>
                ${productsHtml}
                <hr>
                <div class="action-section">
                    <h4>Ubah Status Pesanan:</h4>
                    <div class="status-update-form">
                        <select id="newStatusSelect">
                            <option value="Pending" ${orderInfo.Order_Status === 'Pending' ? 'selected' : ''}>Pending</option>
                            <option value="Diproses" ${orderInfo.Order_Status === 'Diproses' ? 'selected' : ''}>Diproses</option>
                            <option value="Dikirim" ${orderInfo.Order_Status === 'Dikirim' ? 'selected' : ''}>Dikirim</option>
                            <option value="Selesai" ${orderInfo.Order_Status === 'Selesai' ? 'selected' : ''}>Selesai</option>
                            <option value="Dibatalkan" ${orderInfo.Order_Status === 'Dibatalkan' ? 'selected' : ''}>Dibatalkan</option>
                        </select>
                        <input type="text" id="resiInput" placeholder="Masukkan No. Resi (jika dikirim)" value="${orderInfo.Nomor_Resi || ''}">
                        <button class="btn-action btn-save" onclick="updateOrderStatus('${orderId}')">Simpan Perubahan</button>
                    </div>
                </div>
            `;
        });
}

function closeModal() {
    document.getElementById('detailModal').classList.remove('active');
}

function updateOrderStatus(orderId) {
    const newStatus = document.getElementById('newStatusSelect').value;
    const nomorResi = document.getElementById('resiInput').value;

    if (newStatus === 'Dikirim' && !nomorResi) {
        alert('Nomor resi wajib diisi jika status diubah menjadi "Dikirim"!');
        return;
    }

    fetch(`/api/orders/status/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, resi: nomorResi })
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message);
        closeModal();
        loadOrders(); // Refresh tabel utama
    })
    .catch(err => {
        alert('Gagal menyimpan perubahan.');
        console.error(err);
    });
}