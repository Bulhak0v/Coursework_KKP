document.addEventListener('ProjectValidated', async (e) => {
    const token = localStorage.getItem('access_token');
    const PROJECT_ID = e.detail;

    if (!PROJECT_ID) {
        document.getElementById('noDataAlert').style.display = 'block';
        return;
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

            document.getElementById('kpiTotalDefects').textContent =
                data.metrics.total_defects;

            document.getElementById('kpiMttr').textContent =
                data.metrics.mttr_hours;

            document.getElementById('kpiReopenRate').textContent =
                data.metrics.reopen_rate_percent + '%';

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

    if (Chart.getChart(ctx)) {
        Chart.getChart(ctx).destroy();
    }

    Chart.defaults.color = '#8b949e';

    Chart.defaults.font.family =
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';

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
            responsive: true,
            maintainAspectRatio: false,

            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 },
                    grid: { color: '#30363d' }
                },

                x: {
                    grid: { display: false }
                }
            },

            plugins: {
                legend: { display: false }
            }
        }
    });
}

function renderDoughnutChart(labels, data) {
    const ctx = document.getElementById('doughnutChart');

    if (Chart.getChart(ctx)) {
        Chart.getChart(ctx).destroy();
    }

    const colors = [
        '#238636',
        '#8957e5',
        '#f2cc60',
        '#f85149',
        '#58a6ff'
    ];

    new Chart(ctx.getContext('2d'), {
        type: 'doughnut',

        data: {
            labels: labels,

            datasets: [{
                data: data,
                backgroundColor: colors,
                borderColor: '#0d1117',
                borderWidth: 2
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',

            plugins: {
                legend: {
                    position: 'right',

                    labels: {
                        color: '#c9d1d9',
                        padding: 20
                    }
                }
            }
        }
    });
}