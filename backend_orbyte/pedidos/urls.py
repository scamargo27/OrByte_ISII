from django.urls import path
from .views import (
    RegistrarPedidoView, InformePedidosView, EditarPedidoView, EstadosView,
    HistorialPedidoView, GraficoFiltrosView, ProductosMasVendidosView,
    InformeConsolidadoView, ListarProductosView,
)

urlpatterns = [
    path('productos/',                                 ListarProductosView.as_view(),       name='listar-productos'),
    path('pedidos/registrar/',                       RegistrarPedidoView.as_view(),        name='registrar-pedido'),
    path('pedidos/informe/',                          InformePedidosView.as_view(),         name='informe-pedidos'),
    path('pedidos/estados/',                          EstadosView.as_view(),                name='estados-pedido'),
    path('pedidos/consolidado/',                      InformeConsolidadoView.as_view(),     name='informe-consolidado'),
    path('pedidos/grafico/filtros/',                  GraficoFiltrosView.as_view(),         name='grafico-filtros'),
    path('pedidos/grafico/productos-mas-vendidos/',   ProductosMasVendidosView.as_view(),   name='grafico-productos'),
    path('pedidos/<int:pedido_id>/editar/',           EditarPedidoView.as_view(),           name='editar-pedido'),
    path('pedidos/<int:pedido_id>/historial/',        HistorialPedidoView.as_view(),        name='historial-pedido'),
]