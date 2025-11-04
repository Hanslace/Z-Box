fetch('/api/posture-report')
  .then(r => r.json())
  .then(data => {
    const total = data.length;
    const compliant = data.filter((d: any) => d.result.compliant).length;
    const quarantined = total - compliant;
    (document.getElementById('peerCount') as HTMLElement).innerText = String(total);
    (document.getElementById('compliantCount') as HTMLElement).innerText = String(compliant);
    (document.getElementById('quarantineCount') as HTMLElement).innerText = String(quarantined);
  })
  .catch(() => {
    // ignore
  });
