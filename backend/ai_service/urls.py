from django.urls import path
from .views import AIAnalyzeView, SmartRoutingResolveView

urlpatterns = [
    path('analyze/', AIAnalyzeView.as_view(), name='ai_analyze'),
    path('resolve/', SmartRoutingResolveView.as_view(), name='smart_routing_resolve'),
]
