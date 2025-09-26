from . import auth, users, dashboard, students, clusters, datasets, reports

# Export routers so main.py can access them directly
__all__ = ["auth", "users", "dashboard", "students", "clusters", "datasets", "reports"]
