from datetime import datetime, timezone

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from pedidos.models import Pedido
from pedidos.permissions import EsSoloAdmin, EsAdminOTrabajador
from .models import ImportacionExterna
from .serializers import ImportarPedidosSerializer


class ExportarPedidosView(APIView):
    """
    GET /api/interop/exportar/
    Exporta los pedidos de OrByte en el esquema estándar de interoperabilidad.
    Acepta filtros opcionales: fecha_ini, fecha_fin, estado (nombre del estado).
    """
    permission_classes = [EsAdminOTrabajador]

    def get(self, request):
        qs = (
            Pedido.objects
            .select_related('cliente', 'registrado_por', 'estado')
            .prefetch_related('pedidoproducto_set__producto__categoria')
            .order_by('-creado_en')
        )

        fecha_ini     = request.query_params.get('fecha_ini')
        fecha_fin     = request.query_params.get('fecha_fin')
        estado_nombre = request.query_params.get('estado')
        errores       = {}

        if fecha_ini:
            try:
                qs = qs.filter(creado_en__date__gte=datetime.strptime(fecha_ini, '%Y-%m-%d').date())
            except ValueError:
                errores['fecha_ini'] = 'Formato inválido. Use YYYY-MM-DD.'

        if fecha_fin:
            try:
                qs = qs.filter(creado_en__date__lte=datetime.strptime(fecha_fin, '%Y-%m-%d').date())
            except ValueError:
                errores['fecha_fin'] = 'Formato inválido. Use YYYY-MM-DD.'

        if errores:
            return Response(errores, status=status.HTTP_400_BAD_REQUEST)

        if estado_nombre:
            qs = qs.filter(estado__nombre__iexact=estado_nombre)

        pedidos = []
        for p in qs:
            productos = [
                {
                    'nombre':          pp.producto.nombre,
                    'categoria':       pp.producto.categoria.nombre if pp.producto.categoria else '',
                    'cantidad':        pp.cantidad,
                    'precio_unitario': float(pp.precio_unitario_snapshot),
                }
                for pp in p.pedidoproducto_set.all()
            ]
            pedidos.append({
                'sistema':    'OrByte',
                'id_externo': str(p.id),
                'cliente':    p.cliente.nombre,
                'vendedor':   p.registrado_por.nombre,
                'estado':     p.estado.nombre,
                'total':      float(p.total),
                'fecha':      p.creado_en.isoformat(),
                'productos':  productos,
            })

        return Response({
            'sistema':      'OrByte',
            'version':      '1.0',
            'exportado_en': datetime.now(timezone.utc).isoformat(),
            'pedidos':      pedidos,
        })


class ImportarPedidosView(APIView):
    """
    POST /api/interop/importar/
    Recibe el JSON estándar de otro sistema, lo valida y lo almacena para consulta.
    Requiere rol admin.
    """
    permission_classes = [EsSoloAdmin]

    def post(self, request):
        serializer = ImportarPedidosSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data    = serializer.validated_data
        sistema = data['sistema']

        pedidos_normalizados = []
        for p in data['pedidos']:
            pedidos_normalizados.append({
                'sistema':    sistema,
                'id_externo': p['id_externo'],
                'cliente':    p['cliente'],
                'vendedor':   p['vendedor'],
                'estado':     p['estado'],
                'total':      float(p['total']),
                'fecha':      p['fecha'].isoformat() if p['fecha'] else None,
                'productos':  [
                    {
                        'nombre':          pr['nombre'],
                        'categoria':       pr['categoria'],
                        'cantidad':        pr['cantidad'],
                        'precio_unitario': float(pr['precio_unitario']),
                    }
                    for pr in p['productos']
                ],
            })

        importacion = ImportacionExterna.objects.create(
            sistema_origen=sistema,
            importado_por=request.user,
            pedidos=pedidos_normalizados,
            total_pedidos=len(pedidos_normalizados),
        )

        return Response({
            'id':             importacion.id,
            'sistema_origen': importacion.sistema_origen,
            'importado_en':   importacion.importado_en,
            'total_pedidos':  importacion.total_pedidos,
        }, status=status.HTTP_201_CREATED)


class ListarImportacionesView(APIView):
    """
    GET /api/interop/externos/
    Lista todas las importaciones externas almacenadas, con sus pedidos normalizados.
    Acepta filtro opcional: ?sistema=<nombre> (búsqueda parcial).
    Requiere rol admin.
    """
    permission_classes = [EsSoloAdmin]

    def get(self, request):
        qs      = ImportacionExterna.objects.select_related('importado_por').order_by('-importado_en')
        sistema = request.query_params.get('sistema')

        if sistema:
            qs = qs.filter(sistema_origen__icontains=sistema)

        data = [
            {
                'id':             imp.id,
                'sistema_origen': imp.sistema_origen,
                'importado_por':  imp.importado_por.nombre,
                'importado_en':   imp.importado_en,
                'total_pedidos':  imp.total_pedidos,
                'pedidos':        imp.pedidos,
            }
            for imp in qs
        ]

        return Response(data)


class EliminarImportacionView(APIView):
    """
    DELETE /api/interop/externos/<id>/
    Elimina una importación externa. Requiere rol admin.
    """
    permission_classes = [EsSoloAdmin]

    def delete(self, request, importacion_id):
        try:
            importacion = ImportacionExterna.objects.get(id=importacion_id)
        except ImportacionExterna.DoesNotExist:
            return Response({'error': 'Importación no encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        importacion.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
