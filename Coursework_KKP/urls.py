"""
URL configuration for Coursework_KKP project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/architecture/', include('architecture.urls')),
    path('api/defects/', include('defects.urls')),
    path('api/qa-ai/', include('qa_ai.urls')),

    path('login/', TemplateView.as_view(template_name="auth/login.html"), name='frontend_login'),
    path('register/', TemplateView.as_view(template_name="auth/register.html"), name='frontend_register'),
    path('', TemplateView.as_view(template_name="dashboard/index.html"), name='frontend_dashboard'),

    path('architecture/', TemplateView.as_view(template_name="architecture/projects.html"), name='frontend_architecture'),
    path('architecture/graph/', TemplateView.as_view(template_name="architecture/graph.html"), name='frontend_graph'),

    path('defects/', TemplateView.as_view(template_name="defects/list.html"), name='frontend_defects'),
    path('defects/<int:id>/', TemplateView.as_view(template_name="defects/detail.html"), name='frontend_defect_detail'),
]
