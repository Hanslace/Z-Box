const btn = document.getElementById('loginBtn');
if (btn) {
  btn.addEventListener('click', () => {
    window.location.href = '/auth/login';
  });
}
