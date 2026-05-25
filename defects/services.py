from architecture.models import ModuleDependency


def calculate_defect_risk(defect) -> float:
    risk_score = 0.0

    # Severity
    severity_weights = {
        'Low': 10.0,
        'Medium': 30.0,
        'High': 60.0,
        'Critical': 85.0
    }
    risk_score += severity_weights.get(defect.severity, 10.0)

    # Reopen Rate
    risk_score += (defect.reopen_count * 10.0)

    # Impact Analysis
    dependent_modules_count = ModuleDependency.objects.filter(
        target_module=defect.module
    ).count()

    risk_score += (dependent_modules_count * 5.0)

    return min(risk_score, 100.0)