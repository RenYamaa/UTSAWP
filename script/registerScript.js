const form = document.getElementById('registerForm');

form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Reset semua pesan error
    document.querySelectorAll('.error').forEach(el => el.textContent = '');

    const username = form.username.value.trim();
    const email = form.email.value.trim();
    const phone = form.phone.value.trim();
    const password = form.password.value;
    const confirmPassword = form.confirmPassword.value;

    let isValid = true;

    if (password.length < 6) {
        document.getElementById('passwordError').textContent = 'Password minimal 6 karakter.';
        isValid = false;
    }
    if (password !== confirmPassword) {
        document.getElementById('confirmPasswordError').textContent = 'Konfirmasi password tidak cocok.';
        isValid = false;
    }
    if (!isValid) return;

    const formData = { username, email, phone, password };

    fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert(data.message);
            window.location.href = '/login'; // Arahkan ke login setelah berhasil
        } else {
            // Tampilkan error spesifik dari server jika ada
            if (data.field) {
                document.getElementById(`${data.field}Error`).textContent = data.message;
            } else {
                alert(`Error: ${data.message}`);
            }
        }
    })
    .catch(err => {
        alert('Terjadi kesalahan. Silakan coba lagi.');
        console.error(err);
    });
});