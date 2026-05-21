document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    async function loadModulesForSelect() {
        try {
            const res = await fetch('/api/architecture/modules/', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const modules = await res.json();
                const select = document.getElementById('defModule');

                select.innerHTML = '<option value="">Select Module...</option>';

                modules.forEach(mod => {
                    select.innerHTML += `
                        <option value="${mod.id}">
                            ${mod.name}
                        </option>
                    `;
                });
            }
        } catch (error) {
            console.error(error);
        }
    }

    function getStatusBadge(status) {
        switch(status) {
            case 'New':
                return '<span class="badge bg-secondary text-light">New</span>';

            case 'In Progress':
                return '<span class="badge" style="background-color: #0969da;">In Progress</span>';

            case 'Resolved':
                return '<span class="badge bg-success">Resolved</span>';

            case 'Reopened':
                return '<span class="badge bg-danger">Reopened</span>';

            case 'Closed':
                return '<span class="badge" style="background-color: #8b949e;">Closed</span>';

            default:
                return `<span class="badge bg-secondary">${status}</span>`;
        }
    }

    function getSeverityBadge(severity) {
        switch(severity) {
            case 'Critical':
                return '<span class="badge text-bg-danger"><i class="fa-solid fa-fire me-1"></i>Critical</span>';

            case 'High':
                return '<span class="badge text-bg-warning"><i class="fa-solid fa-arrow-up me-1"></i>High</span>';

            case 'Medium':
                return '<span class="badge text-bg-info text-dark">Medium</span>';

            case 'Low':
                return '<span class="badge text-bg-secondary"><i class="fa-solid fa-arrow-down me-1"></i>Low</span>';

            default:
                return `<span class="badge bg-secondary">${severity}</span>`;
        }
    }

    async function loadDefects() {
        const search = document.getElementById('searchFilter').value;
        const status = document.getElementById('statusFilter').value;
        const severity = document.getElementById('severityFilter').value;
        const ordering = document.getElementById('orderFilter').value;

        let url = `/api/defects/defects/?ordering=${ordering}`;

        if (search) {
            url += `&search=${encodeURIComponent(search)}`;
        }

        if (status) {
            url += `&status=${status}`;
        }

        if (severity) {
            url += `&severity=${severity}`;
        }

        try {
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const defects = await res.json();
                const tbody = document.getElementById('defectsTableBody');

                tbody.innerHTML = '';

                if (defects.length === 0) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="7" class="text-center py-4 text-secondary">
                                No defects found matching criteria.
                            </td>
                        </tr>
                    `;

                    return;
                }

                defects.forEach(d => {
                    const riskStyle = d.calculated_risk > 60
                        ? 'color: #f85149; font-weight: bold;'
                        : 'color: #c9d1d9;';

                    tbody.innerHTML += `
                        <tr style="border-bottom: 1px solid #30363d;">
                            <td class="ps-3 py-3">
                                <span class="text-secondary" style="font-size:12px;">
                                    #${d.id}
                                </span>
                                <br>

                                <strong style="color: #c9d1d9;">
                                    ${d.title}
                                </strong>
                            </td>

                            <td>
                                <span class="badge"
                                      style="background-color: #21262d; border: 1px solid #30363d;">
                                    ${d.module_name}
                                </span>
                            </td>

                            <td>${getStatusBadge(d.status)}</td>

                            <td>${getSeverityBadge(d.severity)}</td>

                            <td>
                                <span style="${riskStyle}">
                                    ${d.calculated_risk.toFixed(1)}
                                </span>
                            </td>

                            <td style="font-size: 13px; color: #8b949e;">
                                ${d.reporter_username}
                            </td>

                            <td class="text-end pe-3">
                                <a href="/defects/${d.id}/"
                                   class="btn btn-sm btn-gh-secondary">
                                    Details
                                </a>
                            </td>
                        </tr>
                    `;
                });
            }
        } catch (error) {
            console.error(error);
        }
    }

    document.getElementById('filterForm').addEventListener('submit', (e) => {
        e.preventDefault();
        loadDefects();
    });

    document.getElementById('createDefectForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const payload = {
            title: document.getElementById('defTitle').value,
            module: document.getElementById('defModule').value,
            severity: document.getElementById('defSeverity').value,
            steps_to_reproduce: document.getElementById('defSteps').value,
            status: "New"
        };

        try {
            const res = await fetch('/api/defects/defects/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                bootstrap.Modal
                    .getInstance(document.getElementById('createDefectModal'))
                    .hide();

                document.getElementById('createDefectForm').reset();

                loadDefects();

                Swal.fire({
                    icon: 'success',
                    title: 'Defect Created',
                    background: '#161b22',
                    color: '#c9d1d9'
                });
            }
        } catch (error) {
            console.error(error);
        }
    });

    loadModulesForSelect();
    loadDefects();
});