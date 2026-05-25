document.addEventListener('ProjectValidated', async (e) => {
    const token = localStorage.getItem('access_token');
    const PROJECT_ID = e.detail;

    if (!PROJECT_ID) {
        document.getElementById('noDataAlert').style.display = 'block';
        return;
    }

    const userRole = localStorage.getItem('user_role');
    const exportBtn = document.getElementById('exportCsvBtn');
    const manageTeamBtn = document.getElementById('manageTeamBtn');

    if (userRole === 'PM') {
        if (exportBtn) exportBtn.style.display = 'inline-block';
        if (manageTeamBtn) manageTeamBtn.style.display = 'inline-block';

        if (exportBtn) {
            exportBtn.onclick = async () => {
                try {
                    const res = await fetch(`/api/architecture/projects/${PROJECT_ID}/export_csv/`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (res.ok) {
                        const blob = await res.blob();
                        const downloadUrl = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = downloadUrl;

                        const contentDisp = res.headers.get('Content-Disposition');
                        let fileName = 'Project_Report.csv';
                        if (contentDisp && contentDisp.includes('filename=')) {
                            fileName = contentDisp.split('filename=')[1].replace(/"/g, '');
                        }

                        a.download = fileName;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                    } else {
                        Swal.fire({ icon: 'error', text: 'Failed to export CSV.', background: '#161b22', color: '#c9d1d9'});
                    }
                } catch (error) { console.error("Export error:", error); }
            };
        }

        const loadTeam = async () => {
            const res = await fetch(`/api/architecture/projects/${PROJECT_ID}/members/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const members = await res.json();
                const list = document.getElementById('projectMembersList');
                list.innerHTML = '';

                if (members.length === 0) {
                    list.innerHTML = '<li class="list-group-item text-secondary text-center border-0 bg-transparent">No team members assigned yet.</li>';
                }

                members.forEach(m => {
                    const badgeColor = m.role === 'QA' ? 'bg-success' : 'bg-primary';
                    list.innerHTML += `
                        <li class="list-group-item d-flex justify-content-between align-items-center border-secondary bg-transparent px-0">
                            <span>
                                <i class="fa-regular fa-user text-secondary me-2"></i> ${m.username} 
                                <span class="badge ${badgeColor} ms-2">${m.role}</span>
                            </span>
                            <button class="btn btn-sm text-danger" onclick="removeMember(${m.id})">
                                <i class="fa-solid fa-times"></i>
                            </button>
                        </li>
                    `;
                });
            }
        };

        const loadAvailableUsers = async () => {
            const res = await fetch('/api/auth/users/', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const users = await res.json();
                const select = document.getElementById('availableUsersSelect');
                select.innerHTML = '<option value="">Select engineer to add...</option>';
                users.forEach(u => {
                    select.innerHTML += `<option value="${u.id}">${u.username} (${u.role})</option>`;
                });
            }
        };

        if (manageTeamBtn) {
            manageTeamBtn.addEventListener('click', () => {
                loadTeam();
                loadAvailableUsers();
            });
        }

        const addMemberForm = document.getElementById('addMemberForm');
        if (addMemberForm) {
            addMemberForm.addEventListener('submit', async (ev) => {
                ev.preventDefault();
                const userId = document.getElementById('availableUsersSelect').value;

                const res = await fetch(`/api/architecture/projects/${PROJECT_ID}/members/`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: userId })
                });

                if (res.ok) {
                    Swal.fire({ icon: 'success', title: 'Added', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, background: '#161b22', color: '#c9d1d9'});
                    loadTeam();
                } else {
                    Swal.fire({ icon: 'error', text: 'Error adding member.', background: '#161b22', color: '#c9d1d9'});
                }
            });
        }

        window.removeMember = async (userId) => {
            const res = await fetch(`/api/architecture/projects/${PROJECT_ID}/members/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId })
            });

            if (res.ok) loadTeam();
        };
    }

    try {
        const response = await fetch(`/api/architecture/projects/${PROJECT_ID}/analytics/`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 404) {
            document.getElementById('noDataAlert').style.display = 'block';
            return;
        }

        if (response.ok) {
            const data = await response.json();

            document.getElementById('noDataAlert').style.display = 'none';
            document.getElementById('kpiCards').style.display = 'flex';
            document.getElementById('chartsSection').style.display = 'flex';

            const nameBadge = document.getElementById('projectNameDisplay');
            nameBadge.textContent = data.project_name;
            nameBadge.style.display = 'inline-block';

            document.getElementById('kpiTotalDefects').textContent = data.metrics.total_defects;
            document.getElementById('kpiMttr').textContent = data.metrics.mttr_hours;
            document.getElementById('kpiReopenRate').textContent = data.metrics.reopen_rate_percent + '%';

            const labels = [];
            const openDefectsData = [];
            const stabilityData = [];

            data.modules_statistics.forEach(mod => {
                labels.push(mod.module_name);
                openDefectsData.push(mod.open_defects);
                stabilityData.push(mod.stability_index);
            });

            renderBarChart(labels, openDefectsData);
            renderDoughnutChart(labels, stabilityData);
        }
    } catch (error) {
        console.error("Dashboard fetch error:", error);
    }
});

function renderBarChart(labels, data) {
    const ctx = document.getElementById('barChart');
    if (Chart.getChart(ctx)) Chart.getChart(ctx).destroy();

    Chart.defaults.color = '#8b949e';
    Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';

    new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Open Defects',
                data: data,
                backgroundColor: 'rgba(88, 166, 255, 0.6)',
                borderColor: '#58a6ff',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#30363d' } }, x: { grid: { display: false } } },
            plugins: { legend: { display: false } }
        }
    });
}

function renderDoughnutChart(labels, data) {
    const ctx = document.getElementById('doughnutChart');
    if (Chart.getChart(ctx)) Chart.getChart(ctx).destroy();

    const colors = ['#238636', '#8957e5', '#f2cc60', '#f85149', '#58a6ff'];

    new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{ data: data, backgroundColor: colors, borderColor: '#0d1117', borderWidth: 2 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '65%',
            plugins: { legend: { position: 'right', labels: { color: '#c9d1d9', padding: 20 } } }
        }
    });
}