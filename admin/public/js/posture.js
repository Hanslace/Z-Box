fetch('/api/posture-report')
  .then(r => r.json())
  .then(data => {
    const tbody = document.getElementById('postureTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    data.forEach((item, idx) => {
      const tr = document.createElement('tr');
      tr.className = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50';
      const ip = item.report.ip || '-';
      const os = item.report.os || '-';
      const fw = item.report.firewall_enabled ? 'Yes' : 'No';
      const comp = item.result.compliant ? '✅' : '❌';
      const reasons = item.result.reasons.join(', ') || '-';
      tr.innerHTML = `<td class="px-4 py-2 text-sm">${ip}</td>
        <td class="px-4 py-2 text-sm">${os}</td>
        <td class="px-4 py-2 text-sm">${fw}</td>
        <td class="px-4 py-2 text-sm">${comp}</td>
        <td class="px-4 py-2 text-sm">${reasons}</td>`;
      tbody.appendChild(tr);
    });
  });
