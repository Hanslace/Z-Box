fetch('/api/posture-report')
  .then(r => r.json())
  .then(data => {
    const total = data.length;
    const compliant = data.filter((d) => d.result.compliant).length;
    const quarantined = total - compliant;
    (document.getElementById('peerCount')).innerText = String(total);
    (document.getElementById('compliantCount')).innerText = String(compliant);
    (document.getElementById('quarantineCount') ).innerText = String(quarantined);
  })
  .catch(() => {
    // ignore
  });
