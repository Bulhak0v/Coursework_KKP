import networkx as nx
from .models import SoftwareModule, ModuleDependency


def build_project_impact_graph(project_id: int) -> nx.DiGraph:
    G = nx.DiGraph()

    modules = SoftwareModule.objects.filter(project_id=project_id)
    for mod in modules:
        G.add_node(mod.id, name=mod.name)

    dependencies = ModuleDependency.objects.filter(source_module__project_id=project_id)

    for dep in dependencies:
        G.add_edge(dep.target_module_id, dep.source_module_id)
    return G


def get_regression_scope(module_id: int) -> list:
    try:
        module = SoftwareModule.objects.get(id=module_id)
    except SoftwareModule.DoesNotExist:
        return []

    G = build_project_impact_graph(module.project_id)

    if module_id not in G:
        return []

    impacted_module_ids = list(nx.descendants(G, module_id))
    impacted_modules = SoftwareModule.objects.filter(id__in=impacted_module_ids)
    result = [
        {"id": m.id, "name": m.name}
        for m in impacted_modules
    ]

    return result


def get_graph_data_for_visualization(project_id: int) -> dict:
    G = build_project_impact_graph(project_id)

    nodes = [{"id": node_id, "name": G.nodes[node_id]['name']} for node_id in G.nodes]
    edges = [{"source": u, "target": v} for u, v in G.edges]

    return {"nodes": nodes, "edges": edges}