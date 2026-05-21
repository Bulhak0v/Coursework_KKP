document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    const pathParts = window.location.pathname.split('/');
    const DEFECT_ID = pathParts[pathParts.length - 2];

    function getStatusBadge(status) {
        switch(status) {
            case 'New': return '<span class="badge bg-secondary text-light">New</span>';
            case 'In Progress': return '<span class="badge" style="background-color: #0969da;">In Progress</span>';
            case 'Resolved': return '<span class="badge bg-success">Resolved</span>';
            case 'Reopened': return '<span class="badge bg-danger">Reopened</span>';
            case 'Closed': return '<span class="badge" style="background-color: #8b949e;">Closed</span>';
            default: return `<span class="badge bg-secondary">${status}</span>`;
        }
    }

    function getSeverityHtml(severity) {
        switch(severity) {
            case 'Critical': return '<span class="text-danger"><i class="fa-solid fa-fire me-1"></i>Critical</span>';
            case 'High': return '<span class="text-warning"><i class="fa-solid fa-arrow-up me-1"></i>High</span>';
            case 'Medium': return '<span class="text-info">Medium</span>';
            case 'Low': return '<span class="text-secondary"><i class="fa-solid fa-arrow-down me-1"></i>Low</span>';
            default: return severity;
        }
    }

    async function loadDefectData() {
        try {
            const res = await fetch(`/api/defects/defects/${DEFECT_ID}/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const defect = await res.json();

                document.getElementById('defIdDisplay').textContent = defect.id;
                document.getElementById('defTitleDisplay').textContent = defect.title;
                document.getElementById('defStatusBadge').innerHTML = getStatusBadge(defect.status);
                document.getElementById('newStatusSelect').value = defect.status;

                document.getElementById('defReporterDisplay').textContent = `Reported by @${defect.reporter_username}`;
                document.getElementById('defModuleDisplay').textContent = defect.module_name;
                document.getElementById('defSeverityDisplay').innerHTML = getSeverityHtml(defect.severity);

                const riskElem = document.getElementById('defRiskDisplay');
                riskElem.textContent = defect.calculated_risk.toFixed(1);
                riskElem.style.color = defect.calculated_risk > 60 ? '#f85149' : '#58a6ff';

                document.getElementById('defStepsDisplay').textContent = defect.steps_to_reproduce;
                document.getElementById('reopenRateBadge').textContent = `${defect.reopen_count} reopens`;

                loadHistory();
                checkExistingAiTestCase();
            } else {
                window.location.href = '/defects/';
            }
        } catch (error) {
            console.error(error);
        }
    }

    async function loadHistory() {
        const res = await fetch(`/api/defects/defects/${DEFECT_ID}/history/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const history = await res.json();
            const list = document.getElementById('historyList');

            list.innerHTML = '';

            if (history.length === 0) {
                list.innerHTML = `
                    <li class="list-group-item text-secondary text-center"
                        style="background:transparent; border-color:#30363d; font-size:12px;">
                        No status changes yet
                    </li>
                `;
            }

            history.forEach(item => {
                const date = new Date(item.changed_at).toLocaleString();

                list.innerHTML += `
                    <li class="list-group-item"
                        style="background:transparent; border-color:#30363d; color: #c9d1d9; font-size: 13px;">
                        
                        <div class="d-flex justify-content-between mb-1">
                            <strong style="color: #58a6ff;">@${item.changed_by_username}</strong>
                            <small class="text-secondary">${date}</small>
                        </div>

                        <div>
                            ${getStatusBadge(item.old_status)}
                            <i class="fa-solid fa-arrow-right mx-1 text-secondary"></i>
                            ${getStatusBadge(item.new_status)}
                        </div>
                    </li>
                `;
            });
        }
    }

    document.getElementById('updateStatusForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const newStatus = document.getElementById('newStatusSelect').value;

        const res = await fetch(`/api/defects/defects/${DEFECT_ID}/`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (res.ok) {
            loadDefectData();
        }
    });

    function renderAiResult(data) {
        document.getElementById('aiGeneratorBlock').style.display = 'none';
        document.getElementById('aiResultBlock').style.display = 'block';

        const content = data.generated_content;

        document.getElementById('aiTitle').textContent =
            content.test_case_title || "Generated Test Case";

        document.getElementById('aiPreconditions').textContent =
            content.preconditions || "N/A";

        const stepsHtml = (content.steps_to_test || [])
            .map(step => `<li>${step}</li>`)
            .join('');

        document.getElementById('aiStepsList').innerHTML = stepsHtml;

        document.getElementById('aiExpected').textContent =
            content.expected_result || "N/A";

        document.getElementById('aiRecommendations').innerHTML = `
            <i class="fa-solid fa-triangle-exclamation me-1"></i>
            ${content.regression_recommendations || "No recommendations"}
        `;

        document.getElementById('aiGeneratedBy').textContent =
            `Generated by AI for @${data.generated_by_username} at ${new Date(data.created_at).toLocaleString()}`;
    }

    async function checkExistingAiTestCase() {
        const res = await fetch(`/api/qa-ai/generate/${DEFECT_ID}/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();
            renderAiResult(data);
        }
    }

    document.getElementById('generateAiBtn').addEventListener('click', async () => {
        const btn = document.getElementById('generateAiBtn');

        btn.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin me-2"></i>
            Thinking (Connecting to Gemini LLM)...
        `;

        btn.disabled = true;

        try {
            const res = await fetch(`/api/qa-ai/generate/${DEFECT_ID}/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                const data = await res.json();

                renderAiResult(data);

                Swal.fire({
                    icon: 'success',
                    title: 'Magic Done!',
                    text: 'Test case generated successfully.',
                    background: '#161b22',
                    color: '#c9d1d9'
                });
            } else {
                btn.innerHTML = `
                    <i class="fa-solid fa-robot me-2"></i>
                    Generate Test Case
                `;

                btn.disabled = false;

                Swal.fire({
                    icon: 'error',
                    title: 'AI Error',
                    text: 'Failed to generate test case. Check console.',
                    background: '#161b22',
                    color: '#c9d1d9'
                });
            }
        } catch (error) {
            console.error(error);
        }
    });

    loadDefectData();
});