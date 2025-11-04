fetch('/api/posture-report')
  .then(r => r.json())
  .then(data => {
    const tbody = document.getElementById('postureTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    data.forEach((item, idx) => {
      const rep = item.report || {};
      const res = item.result || {};

      const tr = document.createElement('tr');
      tr.className = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50';

      const wgIp = rep.wg_ip || rep.ip || '-';
      const hostname = rep.hostname || '-';
      const username = rep.username || '-';
      const os = rep.os || '-';
      const fw = rep.firewall_enabled ? 'Yes' : 'No';
      const reportedAt = rep.reported_at || '-';
      const comp = res.compliant ? '✅' : '❌';
      const reasons = (res.reasons && res.reasons.join(', ')) || '-';

      tr.innerHTML = `
        <td class="px-4 py-2 text-sm">${wgIp}</td>
        <td class="px-4 py-2 text-sm">${hostname}</td>
        <td class="px-4 py-2 text-sm">${username}</td>
        <td class="px-4 py-2 text-sm">${os}</td>
        <td class="px-4 py-2 text-sm">${fw}</td>
        <td class="px-4 py-2 text-sm">${reportedAt}</td>
        <td class="px-4 py-2 text-sm">${comp}</td>
        <td class="px-4 py-2 text-sm">${reasons}</td>
      `;
      tbody.appendChild(tr);
    });
  });
