document.addEventListener('DOMContentLoaded', () => {
    // 1. Muat produk dari database saat halaman dibuka
    loadProductsFromDB();

    // 2. Siapkan fungsionalitas tombol filter
    setupFilters();
});

// Fungsi utama untuk mengambil data produk dari server dan menampilkannya
function loadProductsFromDB() {
    const productGrid = document.getElementById('productGrid');
    productGrid.innerHTML = '<p style="text-align: center;">Memuat produk...</p>'; // Teks sementara

    // Meminta data ke API yang sudah kita buat di server.js
    fetch('/api/homepage/products')
        .then(response => response.json())
        .then(products => {
            productGrid.innerHTML = ''; // Kosongkan grid sebelum diisi

            if (products.length === 0) {
                productGrid.innerHTML = '<p style="text-align: center;">Belum ada produk yang tersedia.</p>';
                return;
            }

            products.forEach(product => {
                // Tentukan kategori (A4/A5) dari ID produk
                let category = 'all';
                if (product.ID_Product.startsWith('A4')) category = 'A4';
                if (product.ID_Product.startsWith('A5')) category = 'A5';

                // Buat elemen HTML untuk kartu produk
                const productCard = document.createElement('div');
                productCard.className = 'product-item';
                productCard.setAttribute('data-category', category);

                // Isi kartu dengan data dari database
                productCard.innerHTML = `
                    <div class="product-image-placeholder"></div>
                    <h3 class="product-name">${product.Product_Name}</h3>
                    <p class="product-quantity">Quantity: ${product.Stock}</p>
                `;
                
                productGrid.appendChild(productCard);
            });
        })
        .catch(error => {
            console.error('Error memuat produk:', error);
            productGrid.innerHTML = '<p style="color:red; text-align: center;">Gagal memuat produk. Coba lagi nanti.</p>';
        });
}

// Fungsi untuk membuat tombol filter dan search bar berfungsi
function setupFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const searchInput = document.getElementById('searchInput');

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            searchInput.value = ''; // Hapus pencarian saat filter
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            filterAndSearchProducts();
        });
    });

    // Panggil fungsi search setiap kali ada ketikan di search bar
    searchInput.addEventListener('keyup', filterAndSearchProducts);
}

// Fungsi gabungan untuk memfilter dan mencari produk
function filterAndSearchProducts() {
    const activeFilter = document.querySelector('.filter-btn.active').getAttribute('data-filter');
    const searchTerm = document.getElementById('searchInput').value.toUpperCase();
    const items = document.querySelectorAll('.product-item');

    items.forEach(item => {
        const itemCategory = item.getAttribute('data-category');
        const itemName = item.querySelector('.product-name').textContent.toUpperCase();

        const categoryMatch = (activeFilter === 'all' || itemCategory === activeFilter);
        const searchMatch = (itemName.includes(searchTerm));

        if (categoryMatch && searchMatch) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}