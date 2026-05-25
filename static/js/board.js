document.addEventListener('ProjectValidated', async (e) => {
    const token = localStorage.getItem('access_token');
    const userRole = localStorage.getItem('user_role');
    const currentUser = localStorage.getItem('username');
    const PROJECT_ID = e.detail;

    if (!PROJECT_ID) {
        document.getElementById('boardViewContainer').innerHTML = '<div class="alert alert-dark mx-auto mt-5">No project selected.</div>';
        return;
    }

    if (userRole === 'PM') {
        document.getElementById('addTaskBtn').style.display = 'inline-block';
        loadProjectMembers();
    }

    let allTasks = [];
    let showOnlyMyTasks = false;
    let currentDate = new Date();

    document.getElementById('btnBoardView').addEventListener('change', () => {
        document.getElementById('boardViewContainer').style.display = 'flex';
        document.getElementById('calendarViewContainer').style.display = 'none';
        renderBoard();
    });

    document.getElementById('btnCalendarView').addEventListener('change', () => {
        document.getElementById('boardViewContainer').style.display = 'none';
        document.getElementById('calendarViewContainer').style.display = 'block';
        renderCalendar();
    });

    document.getElementById('myTasksFilter').addEventListener('change', (ev) => {
        showOnlyMyTasks = ev.target.checked;

        if (document.getElementById('btnBoardView').checked) renderBoard();
        else renderCalendar();
    });

    async function loadProjectMembers() {
        const res = await fetch(`/api/architecture/projects/${PROJECT_ID}/members/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const members = await res.json();
            const select = document.getElementById('taskAssignee');

            select.innerHTML = '<option value="">Unassigned</option>';

            members.forEach(m => {
                select.innerHTML += `<option value="${m.id}">${m.username} (${m.role})</option>`;
            });
        }
    }

    async function fetchTasks() {
        const res = await fetch(`/api/architecture/tasks/?project=${PROJECT_ID}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            allTasks = await res.json();

            if (document.getElementById('btnBoardView').checked) renderBoard();
            else renderCalendar();
        }
    }

    function renderBoard() {
        document.getElementById('TODO').innerHTML = '';
        document.getElementById('IN_PROGRESS').innerHTML = '';
        document.getElementById('DONE').innerHTML = '';

        let counts = {
            'TODO': 0,
            'IN_PROGRESS': 0,
            'DONE': 0
        };

        const tasksToRender = showOnlyMyTasks
            ? allTasks.filter(t => t.assignee_username === currentUser)
            : allTasks;

        tasksToRender.forEach(task => {
            counts[task.status]++;

            const assignee = task.assignee_username
                ? `@${task.assignee_username}`
                : 'Unassigned';

            let dueDateHtml = '';

            if (task.due_date) {
                const isOverdue =
                    new Date(task.due_date) < new Date() &&
                    task.status !== 'DONE';

                const color = isOverdue
                    ? 'text-danger'
                    : 'text-secondary';

                dueDateHtml = `
                    <span class="${color}">
                        <i class="fa-regular fa-calendar me-1"></i>
                        ${task.due_date}
                    </span>
                `;
            }

            const card = document.createElement('div');

            card.className = 'task-card';
            card.setAttribute('draggable', 'true');
            card.setAttribute('data-id', task.id);

            card.onclick = () => openTaskDetails(task.id);

            card.innerHTML = `
                <div class="task-title">${task.title}</div>

                <div class="task-meta">
                    <span class="text-secondary">
                        <i class="fa-regular fa-user me-1"></i>
                        ${assignee}
                    </span>

                    ${dueDateHtml}
                </div>
            `;

            card.addEventListener('dragstart', handleDragStart);

            const column = document.getElementById(task.status);

            if (column) column.appendChild(card);
        });

        document.getElementById('count-TODO').textContent = counts['TODO'];
        document.getElementById('count-IN_PROGRESS').textContent = counts['IN_PROGRESS'];
        document.getElementById('count-DONE').textContent = counts['DONE'];
    }

    function handleDragStart(e) {
        e.dataTransfer.setData(
            'text/plain',
            e.target.getAttribute('data-id')
        );

        e.target.style.opacity = '0.5';
    }

    const columns = document.querySelectorAll('.task-list');

    columns.forEach(col => {
        col.addEventListener('dragover', e => {
            e.preventDefault();
            col.classList.add('drag-over');
        });

        col.addEventListener('dragleave', () => {
            col.classList.remove('drag-over');
        });

        col.addEventListener('drop', async (e) => {
            e.preventDefault();

            col.classList.remove('drag-over');

            const taskId = e.dataTransfer.getData('text/plain');
            const newStatus = col.id;

            if (!taskId) return;

            const draggedCard = document.querySelector(
                `[data-id="${taskId}"]`
            );

            if (draggedCard) {
                draggedCard.style.opacity = '1';
                col.appendChild(draggedCard);
            }

            const res = await fetch(`/api/architecture/tasks/${taskId}/`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    status: newStatus
                })
            });

            if (res.ok) fetchTasks();
        });
    });

    document.addEventListener('dragend', e => {
        if (
            e.target.classList &&
            e.target.classList.contains('task-card')
        ) {
            e.target.style.opacity = '1';
        }
    });

    document.getElementById('prevMonthBtn').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('nextMonthBtn').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    function renderCalendar() {
        const grid = document.getElementById('calendarGrid');

        grid.innerHTML = '';

        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

        days.forEach(d => {
            grid.innerHTML += `
                <div class="calendar-day-name">${d}</div>
            `;
        });

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        document.getElementById('calendarMonthYear').textContent =
            new Date(year, month).toLocaleString('en-us', {
                month: 'long',
                year: 'numeric'
            });

        const firstDayOfMonth =
            new Date(year, month, 1).getDay();

        const daysInMonth =
            new Date(year, month + 1, 0).getDate();

        const emptyCells =
            firstDayOfMonth === 0
                ? 6
                : firstDayOfMonth - 1;

        for (let i = 0; i < emptyCells; i++) {
            grid.innerHTML += `
                <div class="calendar-cell empty"></div>
            `;
        }

        const tasksToRender = showOnlyMyTasks
            ? allTasks.filter(t => t.assignee_username === currentUser)
            : allTasks;

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr =
                `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            const tasksOnThisDay =
                tasksToRender.filter(t => t.due_date === dateStr);

            let dotsHtml = '';

            tasksOnThisDay.forEach(t => {
                let dotColor = '#58a6ff';

                if (t.status === 'IN_PROGRESS') {
                    dotColor = '#d29922';
                }

                if (t.status === 'DONE') {
                    dotColor = '#238636';
                }

                dotsHtml += `
                    <span
                        class="task-dot"
                        style="background-color: ${dotColor};"
                        title="${t.title}">
                    </span>
                `;
            });

            const cell = document.createElement('div');

            cell.className = 'calendar-cell';

            cell.innerHTML = `
                <div class="calendar-date">${day}</div>
                <div>${dotsHtml}</div>
            `;

            if (tasksOnThisDay.length > 0) {
                cell.addEventListener('click', () => {
                    openDayTasksModal(dateStr, tasksOnThisDay);
                });
            }

            grid.appendChild(cell);
        }
    }

    function openDayTasksModal(dateStr, tasks) {
        document.getElementById('dayTasksTitle').textContent =
            `Tasks due on ${dateStr}`;

        const list = document.getElementById('dayTasksList');

        list.innerHTML = '';

        tasks.forEach(t => {
            let statusIcon =
                '<i class="fa-regular fa-circle text-secondary"></i>';

            if (t.status === 'IN_PROGRESS') {
                statusIcon =
                    '<i class="fa-regular fa-circle-dot text-warning"></i>';
            }

            if (t.status === 'DONE') {
                statusIcon =
                    '<i class="fa-regular fa-circle-check text-success"></i>';
            }

            list.innerHTML += `
                <li
                    class="list-group-item bg-transparent"
                    style="border-color: #30363d; color: #c9d1d9;">

                    <div class="d-flex justify-content-between align-items-center">
                        <span>
                            ${statusIcon}
                            <strong class="ms-2">${t.title}</strong>
                        </span>

                        <span class="badge bg-secondary">
                            @${t.assignee_username || 'Unassigned'}
                        </span>
                    </div>
                </li>
            `;
        });

        new bootstrap.Modal(
            document.getElementById('dayTasksModal')
        ).show();
    }

    document.getElementById('createTaskForm')
        ?.addEventListener('submit', async (e) => {

        e.preventDefault();

        const payload = {
            project: PROJECT_ID,
            title: document.getElementById('taskTitle').value,
            description: document.getElementById('taskDesc').value,
            assignee: document.getElementById('taskAssignee').value || null,
            due_date: document.getElementById('taskDueDate').value || null,
            status: 'TODO'
        };

        const res = await fetch('/api/architecture/tasks/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            bootstrap.Modal
                .getInstance(document.getElementById('addTaskModal'))
                .hide();

            document.getElementById('createTaskForm').reset();

            Swal.fire({
                icon: 'success',
                title: 'Task Created',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 1500,
                background: '#161b22',
                color: '#c9d1d9'
            });

            fetchTasks();
        }
    });

    window.openTaskDetails = function(taskId) {
        const task = allTasks.find(t => t.id == taskId);

        if (!task) return;

        document.getElementById('viewTaskTitle').textContent =
            task.title;

        const descElem =
            document.getElementById('viewTaskDesc');

        if (
            task.description &&
            task.description.trim() !== ''
        ) {
            descElem.textContent = task.description;
            descElem.style.fontStyle = 'normal';
        } else {
            descElem.textContent = 'No description provided.';
            descElem.style.fontStyle = 'italic';
        }

        const assignee = task.assignee_username
            ? `@${task.assignee_username}`
            : 'Unassigned';

        const dueDate = task.due_date
            ? `Due: ${task.due_date}`
            : 'No due date';

        document.getElementById('viewTaskMeta').innerHTML = `
            <i class="fa-regular fa-user me-1"></i>${assignee}

            <span class="ms-3">
                <i class="fa-regular fa-calendar me-1"></i>
                ${dueDate}
            </span>
        `;

        const statusBadge =
            document.getElementById('viewTaskStatus');

        if (task.status === 'TODO') {
            statusBadge.className = 'badge bg-secondary';

            statusBadge.innerHTML =
                '<i class="fa-regular fa-circle me-1"></i> To Do';
        }

        else if (task.status === 'IN_PROGRESS') {
            statusBadge.className = 'badge text-bg-warning';

            statusBadge.innerHTML =
                '<i class="fa-regular fa-circle-dot me-1"></i> In Progress';
        }

        else if (task.status === 'DONE') {
            statusBadge.className = 'badge bg-success';

            statusBadge.innerHTML =
                '<i class="fa-regular fa-circle-check me-1"></i> Done';
        }

        new bootstrap.Modal(
            document.getElementById('viewTaskModal')
        ).show();
    };

    fetchTasks();
});