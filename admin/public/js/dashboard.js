fetch('/api/nft-stats')
  .then(r => r.json())
  .then(stats => {
    document.getElementById('peerCount').innerText = String(stats.total);
    document.getElementById('compliantCount').innerText = String(stats.compliant);
    document.getElementById('quarantineCount').innerText = String(stats.quarantine);
  })
  .catch(() => {
    // keep zeros
  });
