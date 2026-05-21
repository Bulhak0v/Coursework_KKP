document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('access_token');
    const currentPath = window.location.pathname;

    if (!token && currentPath !== '/login/' && currentPath !== '/register/') {
        window.location.href = '/login/';
        return;
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.clear();
            window.location.href = '/login/';
        });
    }

    const userInfoBlock = document.getElementById('currentUserInfo');
    if (token && userInfoBlock) {
        fetch('/api/auth/profile/', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => {
            if (res.status === 401) {
                localStorage.clear();
                window.location.href = '/login/';
            }
            return res.json();
        })
        .then(data => {
            if (data) {
                localStorage.setItem('user_role', data.role);
                localStorage.setItem('username', data.username);
                userInfoBlock.innerHTML = `<i class="fa-regular fa-circle-user me-1"></i> ${data.username} <span class="badge bg-secondary ms-1">${data.role}</span>`;

                document.getElementById('profUsername').value = data.username;
                document.getElementById('profRole').value = data.role;
                document.getElementById('profEmail').value = data.email;
                document.getElementById('profFirstName').value = data.first_name || '';
                document.getElementById('profLastName').value = data.last_name || '';
                document.getElementById('profBio').value = data.bio || '';
            }
        })
        .catch(err => console.error("Error fetching profile:", err));
    }

    const projectSwitcher = document.getElementById('globalProjectSwitcher');
    if (token && projectSwitcher) {
        fetch('/api/architecture/projects/', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            let projects = Array.isArray(data) ? data : (data.results || []);
            projectSwitcher.innerHTML = '';

            if (projects.length === 0) {
                projectSwitcher.innerHTML = '<option value="">No projects found</option>';
                localStorage.removeItem('active_project_id');
                document.dispatchEvent(new CustomEvent('ProjectValidated', { detail: null }));
                return;
            }

            projects.forEach(p => {
                projectSwitcher.innerHTML += `<option value="${p.id}">${p.name}</option>`;
            });

            let activeId = localStorage.getItem('active_project_id');
            const projectExists = projects.find(p => p.id == activeId);

            if (!activeId || activeId === "undefined" || !projectExists) {
                activeId = projects[0].id;
                localStorage.setItem('active_project_id', activeId);
            }

            projectSwitcher.value = activeId;

            document.dispatchEvent(new CustomEvent('ProjectValidated', { detail: activeId }));

            projectSwitcher.addEventListener('change', (e) => {
                localStorage.setItem('active_project_id', e.target.value);
                window.location.reload();
            });
        })
        .catch(err => {
            console.error("Critical error loading projects:", err);
            projectSwitcher.innerHTML = '<option value="">Error loading</option>';
        });
    }

    document.getElementById('userProfileForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const payload = {
            first_name: document.getElementById('profFirstName').value,
            last_name: document.getElementById('profLastName').value,
            bio: document.getElementById('profBio').value
        };

        try {
            const res = await fetch('/api/auth/profile/', {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                bootstrap.Modal.getInstance(document.getElementById('userProfileModal')).hide();
                Swal.fire({ icon: 'success', title: 'Profile Updated', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, background: '#161b22', color: '#c9d1d9'});
            }
        } catch (error) { console.error(error); }
    });
});