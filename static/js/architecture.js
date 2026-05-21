document.addEventListener('ProjectValidated', async (e) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    const PROJECT_ID = e.detail;

    if (!PROJECT_ID) {
        document.getElementById('initProjectSection').style.display = 'block';
        document.getElementById('mainWorkspace').style.display = 'none';
        return;
    }

    let modulesList = [];

    async function initPage() {
        try {
            const response = await fetch(`/api/architecture/projects/${PROJECT_ID}/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 404) {
                document.getElementById('initProjectSection').style.display = 'block';
                document.getElementById('mainWorkspace').style.display = 'none';
            } else if (response.ok) {
                document.getElementById('initProjectSection').style.display = 'none';
                document.getElementById('mainWorkspace').style.display = 'flex';
                loadModules();
                loadDependencies();
            }
        } catch (error) { console.error(error); }
    }

    document.getElementById('initProjectBtn')?.addEventListener('click', async () => {
        try {
            const res = await fetch('/api/architecture/projects/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: "Main E-commerce System",
                    description: "Auto-generated project."
                })
            });
            if (res.ok) {
                Swal.fire({ icon: 'success', title: 'Project Initialized!', background: '#161b22', color: '#c9d1d9'});

                setTimeout(() => window.location.reload(), 1500);
            }
        } catch (error) { console.error(error); }
    });

    async function loadModules() {
        const res = await fetch('/api/architecture/modules/', { headers: { 'Authorization': `Bearer ${token}` }});
        if (res.ok) {
            const allModules = await res.json();
            modulesList = allModules.filter(mod => mod.project === parseInt(PROJECT_ID));

            const tbody = document.getElementById('modulesTableBody');
            const sourceSelect = document.getElementById('sourceModule');
            const targetSelect = document.getElementById('targetModule');

            tbody.innerHTML = '';
            sourceSelect.innerHTML = '<option value="">Select...</option>';
            targetSelect.innerHTML = '<option value="">Select...</option>';

            modulesList.forEach(mod => {
                tbody.innerHTML += `
                    <tr>
                        <td class="ps-3">${mod.name}</td>
                        <td>
                            <span class="badge ${mod.stability_index > 80 ? 'bg-success' : 'bg-warning text-dark'}">
                                ${mod.stability_index}%
                            </span>
                        </td>
                        <td class="text-end pe-3">
                            <button class="btn btn-sm btn-outline-danger border-0" onclick="deleteModule(${mod.id})">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
                const option = `<option value="${mod.id}">${mod.name}</option>`;
                sourceSelect.innerHTML += option;
                targetSelect.innerHTML += option;
            });
        }
    }

    document.getElementById('addModuleForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('modName').value;
        const desc = document.getElementById('modDesc').value;

        const res = await fetch('/api/architecture/modules/', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ project: PROJECT_ID, name: name, description: desc })
        });

        if (res.ok) {
            bootstrap.Modal.getInstance(document.getElementById('addModuleModal')).hide();
            document.getElementById('addModuleForm').reset();
            loadModules();
        }
    });

    window.deleteModule = async (id) => {
        if (!confirm("Are you sure?")) return;

        const res = await fetch(`/api/architecture/modules/${id}/`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            loadModules();
            loadDependencies();
        } else {
            const errorData = await res.json();
            Swal.fire({
                icon: 'error',
                title: 'Action Denied',
                text: errorData.detail || 'Cannot delete this module.',
                background: '#161b22', color: '#c9d1d9'
            });
        }
    };

    async function loadDependencies() {
        const res = await fetch('/api/architecture/dependencies/', { headers: { 'Authorization': `Bearer ${token}` }});
        if (res.ok) {
            const allDeps = await res.json();

            const validModuleIds = modulesList.map(m => m.id);
            const deps = allDeps.filter(dep => validModuleIds.includes(dep.source_module));

            const list = document.getElementById('dependenciesList');
            list.innerHTML = '';

            if (deps.length === 0) {
                list.innerHTML = '<li class="list-group-item text-secondary text-center" style="background:transparent; border-color:#30363d;">No dependencies configured</li>';
            }

            deps.forEach(dep => {
                list.innerHTML += `
                    <li class="list-group-item d-flex justify-content-between align-items-center" style="background:transparent; border-color:#30363d; color: #c9d1d9;">
                        <span>
                            <strong>${dep.source_module_name}</strong> 
                            <i class="fa-solid fa-arrow-right mx-2 text-secondary"></i> 
                            ${dep.target_module_name}
                        </span>
                        <button class="btn btn-sm text-danger" onclick="deleteDependency(${dep.id})">
                            <i class="fa-solid fa-times"></i>
                        </button>
                    </li>
                `;
            });
        }
    }

    document.getElementById('dependencyForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const src = document.getElementById('sourceModule').value;
        const tgt = document.getElementById('targetModule').value;

        if (src === tgt) {
            Swal.fire({ icon: 'warning', text: 'Module cannot depend on itself!', background: '#161b22', color: '#c9d1d9'});
            return;
        }

        const res = await fetch('/api/architecture/dependencies/', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ source_module: src, target_module: tgt })
        });

        if (res.ok) {
            document.getElementById('dependencyForm').reset();
            loadDependencies();
        } else {
            Swal.fire({ icon: 'error', text: 'Dependency already exists or invalid.', background: '#161b22', color: '#c9d1d9'});
        }
    });

    window.deleteDependency = async (id) => {
        const res = await fetch(`/api/architecture/dependencies/${id}/`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) loadDependencies();
    };

    initPage();
});