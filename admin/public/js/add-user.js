const btn = document.getElementById('submitBtn');
const out = document.getElementById('output');

btn.addEventListener('click', async () => {
  const email = document.getElementById('email').value;
  out.textContent = '...';
  const res = await fetch('/api/provision', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  const data = await res.json();

  // show the sensitive stuff to admin only here
  out.textContent =
    `Email: ${data.email}\n` +
    `Temp Keycloak Password: ${data.tempPass}\n` +
    `VPN IP: ${data.clientIp}\n` +
    `ZIP Password: ${data.zipPassword}\n`;
});
