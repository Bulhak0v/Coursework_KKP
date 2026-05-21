document.addEventListener('ProjectValidated', async (e) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    const PROJECT_ID = e.detail;

    if (!PROJECT_ID) {
        document.getElementById('network-container').innerHTML = `
            <div class="text-center p-5 text-secondary">
                No project data available to draw graph.
            </div>
        `;
        return;
    }

    let network = null;
    let nodesDataSet = null;
    let edgesDataSet = null;

    async function loadGraph() {
        try {
            const res = await fetch(
                `/api/architecture/projects/${PROJECT_ID}/graph_data/`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (res.ok) {
                const data = await res.json();

                if (data.nodes.length === 0) {
                    document.getElementById('network-container').innerHTML = `
                        <div class="text-center p-5 text-secondary">
                            The project has no modules yet.
                        </div>
                    `;
                    return;
                }

                const visNodes = data.nodes.map(n => ({
                    id: n.id,
                    label: n.name,
                    color: {
                        background: '#161b22',
                        border: '#58a6ff'
                    },
                    font: {
                        color: '#c9d1d9'
                    }
                }));

                const visEdges = data.edges.map(e => ({
                    from: e.source,
                    to: e.target,
                    arrows: 'to',
                    color: {
                        color: '#30363d',
                        highlight: '#8b949e'
                    }
                }));

                nodesDataSet = new vis.DataSet(visNodes);
                edgesDataSet = new vis.DataSet(visEdges);

                const container = document.getElementById('network-container');

                const networkData = {
                    nodes: nodesDataSet,
                    edges: edgesDataSet
                };

                const options = {
                    physics: {
                        solver: 'forceAtlas2Based',
                        forceAtlas2Based: {
                            gravitationalConstant: -50,
                            springLength: 100
                        }
                    },
                    interaction: {
                        hover: true,
                        tooltipDelay: 200
                    }
                };

                network = new vis.Network(
                    container,
                    networkData,
                    options
                );

                populateDropdown(data.nodes);
            }
        } catch (error) {
            console.error("Error loading graph:", error);
        }
    }

    function populateDropdown(nodes) {
        const select = document.getElementById('moduleSelect');

        select.innerHTML = `
            <option value="">
                -- Select Module --
            </option>
        `;

        nodes.forEach(n => {
            select.innerHTML += `
                <option value="${n.id}">
                    ${n.name}
                </option>
            `;
        });
    }

    document.getElementById('impactForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const moduleId = document.getElementById('moduleSelect').value;

        if (!moduleId) return;

        try {
            const res = await fetch(
                `/api/architecture/modules/${moduleId}/regression_scope/`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (res.ok) {
                const data = await res.json();

                const allNodesIds = nodesDataSet.getIds();

                const resetUpdates = allNodesIds.map(id => ({
                    id: id,
                    color: {
                        background: '#161b22',
                        border: '#58a6ff'
                    },
                    font: {
                        color: '#c9d1d9'
                    }
                }));

                nodesDataSet.update(resetUpdates);

                nodesDataSet.update({
                    id: parseInt(moduleId),
                    color: {
                        background: '#f85149',
                        border: '#da3633'
                    },
                    font: {
                        color: '#ffffff',
                        bold: true
                    }
                });

                const impactedUpdates = data.regression_scope.map(mod => ({
                    id: mod.id,
                    color: {
                        background: '#d29922',
                        border: '#9e6a03'
                    },
                    font: {
                        color: '#ffffff'
                    }
                }));

                nodesDataSet.update(impactedUpdates);

                document.getElementById('resultsCard').style.display = 'block';

                document.getElementById('impactCount').textContent =
                    data.impacted_count;

                const list = document.getElementById('impactedModulesList');

                list.innerHTML = '';

                if (data.impacted_count === 0) {
                    list.innerHTML = `
                        <li class="list-group-item impact-list-item text-success">
                            <i class="fa-solid fa-check"></i>
                            Safe to change. No dependencies.
                        </li>
                    `;
                } else {
                    data.regression_scope.forEach(mod => {
                        list.innerHTML += `
                            <li class="list-group-item impact-list-item">
                                <i class="fa-solid fa-arrow-turn-down text-warning me-2"></i>
                                ${mod.name}
                            </li>
                        `;
                    });
                }
            }
        } catch (error) {
            console.error("Error analyzing impact:", error);
        }
    });

    document.getElementById('resetGraphBtn').addEventListener('click', () => {
        if (!nodesDataSet) return;

        const allNodesIds = nodesDataSet.getIds();

        const resetUpdates = allNodesIds.map(id => ({
            id: id,
            color: {
                background: '#161b22',
                border: '#58a6ff'
            },
            font: {
                color: '#c9d1d9'
            }
        }));

        nodesDataSet.update(resetUpdates);

        document.getElementById('resultsCard').style.display = 'none';

        document.getElementById('moduleSelect').value = "";
    });

    loadGraph();
});