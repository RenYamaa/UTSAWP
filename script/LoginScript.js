const toggle = document.getElementById("toggleMode");
toggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  toggle.textContent = document.body.classList.contains("dark") ? "🌙 Dark" : "🌞 Light";
});

const form = document.getElementById("loginForm");
const username = document.getElementById("username");
const password = document.getElementById("password");
const usernameError = document.getElementById("usernameError");
const passwordError = document.getElementById("passwordError");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  let valid = true;

  // Reset pesan error
  usernameError.textContent = "";
  passwordError.textContent = "";
  username.classList.remove("shake");
  password.classList.remove("shake");

  // Validasi Username
  if (username.value.trim() === "") {
    usernameError.textContent = "Username Must Be Filled!";
    username.classList.add("shake");
    valid = false;
  }

  // Validasi Password
  if (password.value.trim() === "") {
    passwordError.textContent = "Password Must Be Filled!";
    password.classList.add("shake");
    valid = false;
  }

  if(valid){
    form.submit();
  }
});