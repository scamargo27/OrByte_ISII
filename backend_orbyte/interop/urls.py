from django.urls import path
from .views import (
    ExportarPedidosView, ImportarPedidosView,
    ListarImportacionesView, EliminarImportacionView,
)

urlpatterns = [
    path('interop/exportar/',          ExportarPedidosView.as_view(),      name='interop-exportar'),
    path('interop/importar/',          ImportarPedidosView.as_view(),       name='interop-importar'),
    path('interop/externos/',          ListarImportacionesView.as_view(),   name='interop-externos'),
    path('interop/externos/<int:importacion_id>/', EliminarImportacionView.as_view(), name='interop-eliminar'),
]
