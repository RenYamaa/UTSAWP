document.addEventListener('DOMContentLoaded', () => {
    fetchUserInfo();
    loadTransactions();

    document.getElementById('statusFilter').addEventListener('change', loadTransactions);
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
                document.getElementById('welcomeMessage').textContent = `Halo, ${data.username}! (${data.role})`;
            }
        })
        .catch(err => console.error('Gagal mengambil info user:', err));
}

function loadTransactions() {
    const tbody = document.getElementById('transactionTableBody');
    const status = document.getElementById('statusFilter').value;
    tbody.innerHTML = '<tr><td colspan="8">Memuat transaksi...</td></tr>';

    fetch(`/api/transactions?status=${status}`)
        .then(res => res.json())
        .then(transactions => {
            tbody.innerHTML = '';
            if (transactions.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8">Tidak ada transaksi ditemukan.</td></tr>';
                return;
            }

            transactions.forEach(trx => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${trx.Transaction_ID}</td>
                    <td>${trx.Order_ID}</td>
                    <td>${trx.Username}</td>
                    <td>${new Date(trx.Payment_Date).toLocaleString('id-ID')}</td>
                    <td>Rp ${parseInt(trx.Total_Payment).toLocaleString('id-ID')}</td>
                    <td>${trx.Payment_Method}</td>
                    <td><span class="status-badge status-${trx.Payment_Status.toLowerCase()}">${trx.Payment_Status}</span></td>
                    <td class="action-btns">
                        ${trx.Payment_Status === 'Menunggu' ? `
                            <button class="btn-approve" onclick="updateStatus('${trx.Transaction_ID}', 'Berhasil')">✔️ Setujui</button>
                            <button class="btn-reject" onclick="updateStatus('${trx.Transaction_ID}', 'Gagal')">❌ Tolak</button>
                        ` : '-'}
                    </td>
                `;
                tbody.appendChild(tr);
            });
        })
        .catch(err => {
            tbody.innerHTML = '<tr><td colspan="8" style="color:red;">Gagal memuat data.</td></tr>';
            console.error(err);
        });
}

function updateStatus(transactionId, newStatus) {
    const action = newStatus === 'Berhasil' ? 'menyetujui' : 'menolak';
    if (!confirm(`Apakah Anda yakin ingin ${action} transaksi ini?`)) {
        return;
    }

    fetch(`/api/transactions/update/${transactionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
    })
    .then(res => res.json())
    .then(data => {
        showNotification(data.message, 'success');
        loadTransactions(); // Muat ulang tabel
    })
    .catch(err => {
        showNotification('Gagal memperbarui status!', 'error');
        console.error(err);
    });
}

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