from datetime import datetime

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, Max, Q, F, ExpressionWrapper, DecimalField, Avg

from django.db import transaction

from .models import Pedido, PedidoProducto, Producto, EstadoPedido, AuditoriaEdicionPedido, Categoria, Marca
from .serializers import RegistrarPedidoSerializer, PedidoOutputSerializer, InformePedidoSerializer, EditarPedidoSerializer
from .permissions import EsAdminOTrabajador, EsSoloAdmin


class RegistrarPedidoView(APIView):
    permission_classes = [EsAdminOTrabajador]

    def post(self, request):
        serializer = RegistrarPedidoSerializer(
            data=request.data,
            context={'request': request}
        )
        if serializer.is_valid():
            pedido = serializer.save()
            output = PedidoOutputSerializer(pedido)
            return Response(output.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class InformePedidosView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        rol = request.user.rol.nombre if request.user.rol else None

        if rol not in ['admin', 'trabajador', 'cliente']:
            return Response({'error': 'Sin permisos.'}, status=status.HTTP_403_FORBIDDEN)

        qs = Pedido.objects.select_related(
            'cliente', 'registrado_por', 'estado'
        ).prefetch_related(
            'pedidoproducto_set__producto'
        ).order_by('-creado_en')

        # Los clientes solo pueden ver sus propios pedidos; los filtros externos se ignoran
        if rol == 'cliente':
            qs = qs.filter(cliente=request.user)
        else:
            # --- filtros opcionales para admin / trabajador ---
            fecha_ini  = request.query_params.get('fecha_ini')
            fecha_fin  = request.query_params.get('fecha_fin')
            estado_id  = request.query_params.get('estado_id')
            cliente_id = request.query_params.get('cliente_id')
            registrado_por_id = request.query_params.get('registrado_por_id')

            errores = {}

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

            if estado_id:
                qs = qs.filter(estado_id=estado_id)
            if cliente_id:
                qs = qs.filter(cliente_id=cliente_id)
            if registrado_por_id:
                qs = qs.filter(registrado_por_id=registrado_por_id)

        total_pedidos = qs.count()
        monto_total   = qs.aggregate(total=Sum('total'))['total'] or 0

        serializer = InformePedidoSerializer(qs, many=True)

        return Response({
            'resumen': {
                'total_pedidos': total_pedidos,
                'monto_total':   monto_total,
            },
            'pedidos': serializer.data,
        })


class EditarPedidoView(APIView):
    permission_classes = [EsAdminOTrabajador]

    def patch(self, request, pedido_id):
        try:
            pedido = Pedido.objects.select_related('estado').get(id=pedido_id)
        except Pedido.DoesNotExist:
            return Response({'error': 'Pedido no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = EditarPedidoSerializer(data=request.data, context={'pedido': pedido})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        nuevo_estado   = EstadoPedido.objects.get(id=serializer.validated_data['estado_id'])
        estado_anterior = pedido.estado

        with transaction.atomic():
            if nuevo_estado.nombre == 'Cancelado':
                for item in PedidoProducto.objects.filter(pedido=pedido):
                    producto = Producto.objects.select_for_update().get(id=item.producto_id)
                    producto.stock_disponible += item.cantidad
                    producto.stock_reservado  -= item.cantidad
                    producto.save()

            elif nuevo_estado.nombre == 'Completado':
                for item in PedidoProducto.objects.filter(pedido=pedido):
                    producto = Producto.objects.select_for_update().get(id=item.producto_id)
                    producto.stock_reservado -= item.cantidad
                    producto.save()

            pedido.estado = nuevo_estado
            pedido.save()

            AuditoriaEdicionPedido.objects.create(
                pedido=pedido,
                editado_por=request.user,
                motivo=serializer.validated_data['motivo'],
                pedido_antes={'estado_id': estado_anterior.id, 'estado': estado_anterior.nombre},
                pedido_despues={'estado_id': nuevo_estado.id, 'estado': nuevo_estado.nombre},
            )

        output = PedidoOutputSerializer(pedido)
        return Response(output.data, status=status.HTTP_200_OK)


class EstadosView(APIView):
    permission_classes = [EsAdminOTrabajador]

    def get(self, request):
        estados = EstadoPedido.objects.all().values('id', 'nombre').order_by('id')
        return Response(list(estados))


class HistorialPedidoView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pedido_id):
        try:
            pedido = Pedido.objects.select_related(
                'cliente', 'registrado_por', 'estado'
            ).get(id=pedido_id)
        except Pedido.DoesNotExist:
            return Response({'error': 'Pedido no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        rol = request.user.rol.nombre if request.user.rol else None

        if rol == 'cliente' and pedido.cliente != request.user:
            return Response({'error': 'Sin permisos.'}, status=status.HTTP_403_FORBIDDEN)

        if rol not in ['admin', 'trabajador', 'cliente']:
            return Response({'error': 'Sin permisos.'}, status=status.HTTP_403_FORBIDDEN)

        auditorias = (
            AuditoriaEdicionPedido.objects
            .filter(pedido=pedido)
            .select_related('editado_por')
            .order_by('editado_en')
        )

        historial = [
            {
                'tipo':        'creacion',
                'usuario':     pedido.registrado_por.nombre,
                'fecha':       pedido.creado_en,
                'descripcion': 'Pedido registrado en el sistema',
                'motivo':      None,
            }
        ]

        for a in auditorias:
            desde = a.pedido_antes.get('estado', '')
            hacia = a.pedido_despues.get('estado', '')
            historial.append({
                'tipo':        'cambio_estado',
                'usuario':     a.editado_por.nombre,
                'fecha':       a.editado_en,
                'descripcion': f'{desde} → {hacia}',
                'motivo':      a.motivo,
            })

        return Response({
            'pedido': {
                'id':              pedido.id,
                'cliente_nombre':  pedido.cliente.nombre,
                'registrado_por':  pedido.registrado_por.nombre,
                'total':           pedido.total,
                'estado':          pedido.estado.nombre,
                'creado_en':       pedido.creado_en,
            },
            'historial': historial,
        })


class GraficoFiltrosView(APIView):
    permission_classes = [EsSoloAdmin]

    def get(self, request):
        anios = list(
            Pedido.objects
            .filter(estado__nombre='Completado')
            .dates('creado_en', 'year')
            .values_list('creado_en__year', flat=True)
            .distinct()
        )
        categorias = list(Categoria.objects.order_by('nombre').values('id', 'nombre'))
        marcas     = list(Marca.objects.order_by('nombre').values('id', 'nombre'))

        return Response({
            'anios':      sorted(set(anios), reverse=True),
            'categorias': categorias,
            'marcas':     marcas,
        })


class ProductosMasVendidosView(APIView):
    permission_classes = [EsSoloAdmin]

    def get(self, request):
        anio         = request.query_params.get('anio')
        mes          = request.query_params.get('mes')
        categoria_id = request.query_params.get('categoria_id')
        marca_id     = request.query_params.get('marca_id')
        top          = request.query_params.get('top', 10)

        errores = {}

        if anio:
            try:
                anio = int(anio)
                if anio < 2000 or anio > 2100:
                    raise ValueError
            except ValueError:
                errores['anio'] = 'Debe ser un año válido (ej. 2024).'

        if mes:
            try:
                mes = int(mes)
                if mes < 1 or mes > 12:
                    raise ValueError
            except ValueError:
                errores['mes'] = 'Debe ser un número entre 1 y 12.'
            if mes and not anio:
                errores['mes'] = 'Se requiere "anio" para filtrar por mes.'

        try:
            top = int(top)
            if top < 1:
                raise ValueError
        except ValueError:
            errores['top'] = 'Debe ser un entero positivo.'

        if errores:
            return Response(errores, status=status.HTTP_400_BAD_REQUEST)

        qs = (
            PedidoProducto.objects
            .filter(pedido__estado__nombre='Completado')
            .select_related('producto__categoria', 'producto__marca')
        )

        if anio:
            qs = qs.filter(pedido__creado_en__year=anio)
        if mes:
            qs = qs.filter(pedido__creado_en__month=mes)
        if categoria_id:
            qs = qs.filter(producto__categoria_id=categoria_id)
        if marca_id:
            qs = qs.filter(producto__marca_id=marca_id)

        # Stats globales del período (sin límite top)
        stats = qs.aggregate(
            total_unidades=Sum('cantidad'),
            total_pedidos=Count('pedido', distinct=True),
            total_ingresos=Sum(
                ExpressionWrapper(
                    F('cantidad') * F('precio_unitario_snapshot'),
                    output_field=DecimalField(max_digits=14, decimal_places=2)
                )
            ),
        )

        resultados = (
            qs
            .values(
                'producto__id',
                'producto__nombre',
                'producto__categoria__nombre',
                'producto__marca__nombre',
            )
            .annotate(
                total_vendido=Sum('cantidad'),
                ingresos_totales=Sum(
                    ExpressionWrapper(
                        F('cantidad') * F('precio_unitario_snapshot'),
                        output_field=DecimalField(max_digits=14, decimal_places=2)
                    )
                ),
            )
            .order_by('-total_vendido')[:top]
        )

        data = [
            {
                'producto_id':      r['producto__id'],
                'nombre':           r['producto__nombre'],
                'categoria':        r['producto__categoria__nombre'],
                'marca':            r['producto__marca__nombre'],
                'total_vendido':    r['total_vendido'],
                'ingresos_totales': r['ingresos_totales'],
            }
            for r in resultados
        ]

        return Response({
            'resumen': {
                'total_pedidos':  stats['total_pedidos'] or 0,
                'total_unidades': stats['total_unidades'] or 0,
                'total_ingresos': stats['total_ingresos'] or 0,
            },
            'filtros_aplicados': {
                'anio':          anio or None,
                'mes':           mes or None,
                'categoria_id':  int(categoria_id) if categoria_id else None,
                'marca_id':      int(marca_id) if marca_id else None,
                'top':           top,
            },
            'productos': data,
        })


class ListarProductosView(APIView):
    permission_classes = [EsAdminOTrabajador]

    def get(self, request):
        qs = (
            Producto.objects
            .filter(activo=True)
            .select_related('categoria', 'marca')
            .order_by('nombre')
            .values('id', 'nombre', 'precio_unitario', 'stock_disponible',
                    'categoria__nombre', 'marca__nombre', 'imagen_url')
        )
        data = [
            {
                'id':               p['id'],
                'nombre':           p['nombre'],
                'precio_unitario':  p['precio_unitario'],
                'stock_disponible': p['stock_disponible'],
                'categoria':        p['categoria__nombre'],
                'marca':            p['marca__nombre'],
                'imagen_url':       p['imagen_url'],
            }
            for p in qs
        ]
        return Response(data)


class InformeConsolidadoView(APIView):
    permission_classes = [EsSoloAdmin]

    def get(self, request):
        ingreso_expr = ExpressionWrapper(
            F('cantidad') * F('precio_unitario_snapshot'),
            output_field=DecimalField(max_digits=14, decimal_places=2)
        )

        # --- Clientes ---
        clientes_qs = (
            Pedido.objects
            .values('cliente_id', 'cliente__nombre', 'cliente__cedula')
            .annotate(
                total_pedidos=Count('id'),
                total_gastado=Sum('total', filter=Q(estado__nombre='Completado')),
                ultimo_pedido=Max('creado_en'),
            )
            .order_by('-total_pedidos')
        )
        clientes = [
            {
                'nombre':        r['cliente__nombre'],
                'cedula':        r['cliente__cedula'],
                'total_pedidos': r['total_pedidos'],
                'total_gastado': r['total_gastado'] or 0,
                'ultimo_pedido': r['ultimo_pedido'],
            }
            for r in clientes_qs
        ]

        # --- Vendedores ---
        vendedores_qs = (
            Pedido.objects
            .values('registrado_por_id', 'registrado_por__nombre')
            .annotate(
                total_pedidos=Count('id'),
                cancelados=Count('id', filter=Q(estado__nombre='Cancelado')),
                ventas=Sum('total', filter=Q(estado__nombre='Completado')),
            )
            .order_by('-total_pedidos')
        )
        vendedores = [
            {
                'nombre':        r['registrado_por__nombre'],
                'total_pedidos': r['total_pedidos'],
                'cancelados':    r['cancelados'],
                'ventas':        r['ventas'] or 0,
            }
            for r in vendedores_qs
        ]

        # --- Productos (solo pedidos Completados) ---
        productos_qs = (
            PedidoProducto.objects
            .filter(pedido__estado__nombre='Completado')
            .values('producto_id', 'producto__nombre', 'producto__categoria__nombre')
            .annotate(
                unidades_vendidas=Sum('cantidad'),
                pedidos_count=Count('pedido', distinct=True),
                ingresos_totales=Sum(ingreso_expr),
                precio_promedio=Avg('precio_unitario_snapshot'),
            )
            .order_by('-ingresos_totales')
        )
        productos = [
            {
                'nombre':           r['producto__nombre'],
                'categoria':        r['producto__categoria__nombre'],
                'unidades_vendidas': r['unidades_vendidas'],
                'pedidos':          r['pedidos_count'],
                'ingresos_totales': r['ingresos_totales'] or 0,
                'precio_promedio':  r['precio_promedio'] or 0,
            }
            for r in productos_qs
        ]

        # --- Categorías (solo pedidos Completados) ---
        categorias_qs = (
            PedidoProducto.objects
            .filter(pedido__estado__nombre='Completado')
            .values('producto__categoria__nombre')
            .annotate(
                unidades_vendidas=Sum('cantidad'),
                pedidos_count=Count('pedido', distinct=True),
                ingresos_totales=Sum(ingreso_expr),
            )
            .order_by('-ingresos_totales')
        )
        categorias = []
        for r in categorias_qs:
            ingresos = r['ingresos_totales'] or 0
            pedidos  = r['pedidos_count']
            ticket   = round(float(ingresos) / pedidos, 2) if pedidos > 0 else 0
            categorias.append({
                'categoria':        r['producto__categoria__nombre'],
                'unidades_vendidas': r['unidades_vendidas'],
                'pedidos':          pedidos,
                'ingresos_totales': ingresos,
                'ticket_promedio':  ticket,
            })

        return Response({
            'clientes':   clientes,
            'vendedores': vendedores,
            'productos':  productos,
            'categorias': categorias,
        })