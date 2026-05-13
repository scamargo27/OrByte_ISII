from django.urls import path
from .views import LoginView, LogoutView, BuscarClienteView

urlpatterns = [
    path('login/',                    LoginView.as_view(),         name='login'),
    path('logout/',                   LogoutView.as_view(),        name='logout'),
    path('clientes/buscar/',          BuscarClienteView.as_view(), name='buscar-cliente'),
]