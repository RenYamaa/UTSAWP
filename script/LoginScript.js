const toggle = document.getElementById("toggleMode");
const form = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const usernameError = document.getElementById("usernameError");
const passwordError = document.getElementById("passwordError");
const loginError = document.getElementById("loginError"); // Ambil elemen error baru
const card = document.querySelector('.card');

if (toggle) {
  toggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    toggle.textContent = document.body.classList.contains("dark") ? "🌙 Dark" : "🌞 Light";
  });
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  
  // Reset pesan error
  usernameError.textContent = "";
  passwordError.textContent = "";
  loginError.textContent = ""; // Reset error dari server
  usernameInput.classList.remove("shake");
  passwordInput.classList.remove("shake");
  card.classList.remove('shake');

  let valid = true;
  if (usernameInput.value.trim() === "") {
    usernameError.textContent = "Username harus diisi!";
    usernameInput.classList.add("shake");
    valid = false;
  }
  if (passwordInput.value.trim() === "") {
    passwordError.textContent = "Password harus diisi!";
    passwordInput.classList.add("shake");
    valid = false;
  }

  if (valid) {
    const formData = {
      username: usernameInput.value,
      password: passwordInput.value,
      keep: document.getElementById('keep').checked
    };

    fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        window.location.href = '/main-menu'; // Redirect jika sukses
      } else {
        // Tampilkan pesan error dari server dan goyangkan kartunya
        loginError.textContent = data.message;
        card.classList.add('shake');
      }
    })
    .catch(err => {
      loginError.textContent = 'Terjadi kesalahan jaringan. Coba lagi.';
      card.classList.add('shake');
    });
  }
});