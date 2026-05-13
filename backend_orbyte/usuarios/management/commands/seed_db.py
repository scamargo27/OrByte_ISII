from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import connection
from datetime import timedelta

from usuarios.models import Rol, Usuario
from pedidos.models import (
    Marca, Categoria, Producto,
    EstadoPedido, Pedido, PedidoProducto, AuditoriaEdicionPedido
)

MOTIVOS = {
    ('Registrado',     'En preparación'): 'Pedido verificado y confirmado, se inicia la preparación.',
    ('En preparación', 'Enviado'):        'Productos empacados y entregados al transportista.',
    ('Enviado',        'Completado'):     'Cliente confirmó la recepción del pedido.',
    ('Registrado',     'Cancelado'):      'Cliente solicitó cancelación antes del inicio de preparación.',
    ('En preparación', 'Cancelado'):      'Inconveniente con el stock al momento de preparar el pedido.',
}

def completado(cliente, vendedor, items, dias):
    """Atajo para generar un pedido completado con sus 3 transiciones."""
    return {
        'cliente':      cliente,
        'vendedor':     vendedor,
        'items':        items,
        'estado_final': 'Completado',
        'dias_creacion': dias,
        'transiciones': [
            ('Registrado',     'En preparación', vendedor, dias - 4),
            ('En preparación', 'Enviado',         vendedor, dias - 8),
            ('Enviado',        'Completado',       vendedor, dias - 12),
        ],
    }


class Command(BaseCommand):
    help = 'Carga datos de prueba en la base de datos'

    def handle(self, *args, **kwargs):
        now = timezone.now()

        # ── Roles ──────────────────────────────────────────────────────────────
        roles = {}
        for nombre in ['admin', 'trabajador', 'cliente']:
            obj, _ = Rol.objects.get_or_create(nombre=nombre)
            roles[nombre] = obj
        self.stdout.write('✅ Roles')

        # ── Estados ────────────────────────────────────────────────────────────
        estados = {}
        for nombre in ['Registrado', 'En preparación', 'Enviado', 'Completado', 'Cancelado']:
            obj, _ = EstadoPedido.objects.get_or_create(nombre=nombre)
            estados[nombre] = obj
        self.stdout.write('✅ Estados')

        # ── Marcas ─────────────────────────────────────────────────────────────
        marcas = {}
        for nombre in ['Logitech', 'Razer', 'HyperX']:
            obj, _ = Marca.objects.get_or_create(nombre=nombre)
            marcas[nombre] = obj
        self.stdout.write('✅ Marcas')

        # ── Categorías ─────────────────────────────────────────────────────────
        cats = {}
        for nombre in ['Teclados', 'Mouses', 'Diademas']:
            obj, _ = Categoria.objects.get_or_create(nombre=nombre)
            cats[nombre] = obj
        self.stdout.write('✅ Categorías')

        # ── Usuarios ───────────────────────────────────────────────────────────
        usuarios_data = [
            # (nombre, email, password, rol, is_staff, cedula, telefono)
            ('Carlos Rodríguez', 'admin@orbyte.com',   'admin1234',   'admin',      True,  '1020304050', '3001234567'),
            ('María García',     'maria.g@orbyte.com', 'trab1234',    'trabajador', False, '1030405060', '3012345678'),
            ('Luis Fernández',   'luis.f@orbyte.com',  'trab1234',    'trabajador', False, '1040506070', '3023456789'),
            ('Juan Pérez',       'juan@gmail.com',     'cliente1234', 'cliente',    False, '1050607080', '3101234567'),
            ('Ana Martínez',     'ana@gmail.com',      'cliente1234', 'cliente',    False, '1060708090', '3112345678'),
            ('Pedro Soto',       'pedro@gmail.com',    'cliente1234', 'cliente',    False, '1070809100', '3123456789'),
            ('Sofía Vargas',     'sofia@gmail.com',    'cliente1234', 'cliente',    False, '1080910110', '3134567890'),
            ('Andrés Castro',    'andres@gmail.com',   'cliente1234', 'cliente',    False, '1091011120', '3145678901'),
        ]
        usuarios = {}
        for nombre, email, password, rol_nombre, is_staff, cedula, telefono in usuarios_data:
            if not Usuario.objects.filter(email=email).exists():
                user = Usuario.objects.create_user(
                    email=email, nombre=nombre, password=password,
                    rol=roles[rol_nombre], is_staff=is_staff, is_superuser=is_staff,
                    cedula=cedula, telefono=telefono,
                )
            else:
                user = Usuario.objects.get(email=email)
                if not user.cedula:
                    user.cedula = cedula
                    user.save(update_fields=['cedula'])
            usuarios[email] = user
        self.stdout.write('✅ Usuarios')

        # ── Productos ──────────────────────────────────────────────────────────
        # Stock alto para soportar el volumen de pedidos del seed.
        # update_or_create permite re-ejecutar el seed en una BD existente.
        productos_data = [
            ('Logitech MX Keys',       'Teclado inalámbrico premium',          320000, 80, 'Teclados', 'Logitech'),
            ('Logitech MX Master 3',   'Mouse ergonómico inalámbrico',         280000, 80, 'Mouses',   'Logitech'),
            ('Razer BlackWidow V4',    'Teclado mecánico con switches Razer',  450000, 50, 'Teclados', 'Razer'),
            ('Razer DeathAdder V3',    'Mouse gaming con sensor Focus Pro',    230000, 80, 'Mouses',   'Razer'),
            ('Razer Kraken V3',        'Diadema gaming con THX Spatial',       350000, 60, 'Diademas', 'Razer'),
            ('HyperX Alloy Origins',   'Teclado mecánico compacto TKL',        380000, 50, 'Teclados', 'HyperX'),
            ('HyperX Pulsefire Haste', 'Mouse ultraligero para gaming',        180000, 80, 'Mouses',   'HyperX'),
            ('HyperX Cloud Alpha',     'Diadema con drivers duales de cámara', 310000, 60, 'Diademas', 'HyperX'),
        ]
        productos = {}
        for nombre, desc, precio, stock, cat, marca in productos_data:
            obj, _ = Producto.objects.update_or_create(
                nombre=nombre,
                defaults={
                    'descripcion':      desc,
                    'precio_unitario':  precio,
                    'stock_disponible': stock,
                    'stock_reservado':  0,
                    'categoria':        cats[cat],
                    'marca':            marcas[marca],
                }
            )
            productos[nombre] = obj
        self.stdout.write('✅ Productos')

        # Alias cortos para productos
        MX_K  = 'Logitech MX Keys'
        MX_M  = 'Logitech MX Master 3'
        BW    = 'Razer BlackWidow V4'
        DA    = 'Razer DeathAdder V3'
        KR    = 'Razer Kraken V3'
        AO    = 'HyperX Alloy Origins'
        PF    = 'HyperX Pulsefire Haste'
        CA    = 'HyperX Cloud Alpha'

        # Alias para vendedores / registradores
        C  = 'maria.g@orbyte.com'   # María García   (trabajadora)
        A  = 'luis.f@orbyte.com'    # Luis Fernández  (trabajador)
        AD = 'admin@orbyte.com'     # Carlos Rodríguez (admin)

        # Alias para clientes
        JU = 'juan@gmail.com'
        AN = 'ana@gmail.com'
        PE = 'pedro@gmail.com'
        SO = 'sofia@gmail.com'
        AR = 'andres@gmail.com'

        # días desde hoy (2026-05-08) hacia atrás:
        #   Nov 2025 → 159–188  |  Dic 2025 → 128–158  |  Ene 2026 → 97–127
        #   Feb 2026 →  69–96   |  Mar 2026 →  38–68   |  Abr 2026 →  8–37
        #   May 2026 →   1–7

        pedidos_config = [

            # ══ NOVIEMBRE 2025 — 6 completados ══════════════════════════════════
            completado(JU, C,  [(MX_K, 1), (DA, 1)],       185),
            completado(AN, A,  [(MX_M, 2)],                 178),
            completado(PE, AD, [(KR, 1), (PF, 1)],          173),
            completado(SO, C,  [(BW, 1), (CA, 1)],          168),
            completado(AR, A,  [(PF, 2), (DA, 1)],          163),
            completado(JU, AD, [(MX_M, 1), (AO, 1)],        160),

            # ══ DICIEMBRE 2025 — 7 completados + 1 cancelado ════════════════════
            completado(AN, C,  [(MX_K, 1), (MX_M, 1)],     155),
            completado(PE, A,  [(DA, 2), (PF, 1)],          150),
            completado(SO, AD, [(CA, 2), (KR, 1)],          148),
            completado(AR, C,  [(MX_M, 1), (BW, 1)],        143),
            completado(JU, A,  [(PF, 2), (AO, 1)],          138),
            completado(AN, AD, [(DA, 1), (CA, 1)],           134),
            completado(PE, C,  [(MX_K, 2)],                  131),
            {
                'cliente': SO, 'vendedor': A,
                'items': [(KR, 1)],
                'estado_final': 'Cancelado', 'dias_creacion': 129,
                'transiciones': [('Registrado', 'Cancelado', A, 127)],
            },

            # ══ ENERO 2026 — 8 completados + 1 cancelado ════════════════════════
            completado(AR, C,  [(MX_M, 1), (PF, 2)],        126),
            completado(JU, A,  [(DA, 2), (MX_K, 1)],        122),
            completado(AN, AD, [(BW, 1), (CA, 1)],           120),
            completado(PE, C,  [(MX_M, 1), (DA, 1)],         117),
            completado(SO, A,  [(PF, 2), (KR, 1)],           114),
            completado(AR, AD, [(AO, 1), (CA, 2)],           110),
            completado(JU, C,  [(DA, 1), (PF, 1)],           107),
            completado(AN, A,  [(MX_M, 1), (DA, 1)],         103),
            {
                'cliente': PE, 'vendedor': AD,
                'items': [(KR, 1)],
                'estado_final': 'Cancelado', 'dias_creacion': 100,
                'transiciones': [
                    ('Registrado',     'En preparación', AD, 97),
                    ('En preparación', 'Cancelado',      AD, 95),
                ],
            },

            # ══ FEBRERO 2026 — 5 completados + 1 cancelado + 1 enviado ══════════
            completado(SO, C,  [(MX_K, 1), (MX_M, 1)],      94),
            completado(AR, A,  [(PF, 2), (CA, 1)],           88),
            completado(JU, AD, [(DA, 2), (AO, 1)],           84),
            completado(AN, C,  [(BW, 1), (KR, 1)],           80),
            completado(PE, A,  [(MX_M, 1), (PF, 1)],         76),
            {
                'cliente': SO, 'vendedor': AD,
                'items': [(CA, 1)],
                'estado_final': 'Cancelado', 'dias_creacion': 72,
                'transiciones': [('Registrado', 'Cancelado', AD, 70)],
            },
            {
                'cliente': AR, 'vendedor': C,
                'items': [(AO, 1), (DA, 1)],
                'estado_final': 'Enviado', 'dias_creacion': 70,
                'transiciones': [
                    ('Registrado',     'En preparación', C, 67),
                    ('En preparación', 'Enviado',        C, 63),
                ],
            },

            # ══ MARZO 2026 — 7 completados + 1 cancelado + 2 en preparación ═════
            completado(JU, A,  [(MX_M, 1), (CA, 1)],         66),
            completado(AN, AD, [(PF, 2), (DA, 1)],            62),
            completado(PE, C,  [(MX_K, 1), (BW, 1)],         59),
            completado(SO, A,  [(MX_M, 1), (KR, 1)],         56),
            completado(AR, AD, [(DA, 1), (PF, 2)],            52),
            completado(JU, C,  [(CA, 1), (AO, 1)],           48),
            completado(AN, A,  [(MX_M, 1), (MX_K, 1)],       45),
            {
                'cliente': PE, 'vendedor': C,
                'items': [(PF, 1)],
                'estado_final': 'Cancelado', 'dias_creacion': 42,
                'transiciones': [
                    ('Registrado',     'En preparación', C, 40),
                    ('En preparación', 'Cancelado',      C, 38),
                ],
            },
            {
                'cliente': SO, 'vendedor': AD,
                'items': [(KR, 1), (CA, 1)],
                'estado_final': 'En preparación', 'dias_creacion': 40,
                'transiciones': [('Registrado', 'En preparación', AD, 37)],
            },
            {
                'cliente': AR, 'vendedor': A,
                'items': [(MX_K, 1)],
                'estado_final': 'En preparación', 'dias_creacion': 38,
                'transiciones': [('Registrado', 'En preparación', A, 35)],
            },

            # ══ ABRIL 2026 — 4 completados + 1 cancelado + 1 enviado + 1 registrado
            completado(JU, AD, [(MX_M, 1), (PF, 1)],         35),
            completado(AN, C,  [(DA, 1), (CA, 1)],            30),
            completado(PE, A,  [(MX_K, 1), (KR, 1)],         25),
            completado(SO, AD, [(DA, 1), (MX_K, 1)],         20),
            {
                'cliente': AR, 'vendedor': C,
                'items': [(PF, 1)],
                'estado_final': 'Cancelado', 'dias_creacion': 15,
                'transiciones': [('Registrado', 'Cancelado', C, 13)],
            },
            {
                'cliente': JU, 'vendedor': A,
                'items': [(BW, 1)],
                'estado_final': 'Enviado', 'dias_creacion': 12,
                'transiciones': [
                    ('Registrado',     'En preparación', A,  9),
                    ('En preparación', 'Enviado',        A,  4),
                ],
            },
            {
                'cliente': AN, 'vendedor': AD,
                'items': [(DA, 1)],
                'estado_final': 'Registrado', 'dias_creacion': 9,
                'transiciones': [],
            },

            # ══ MAYO 2026 — 2 en preparación + 1 registrado ═════════════════════
            {
                'cliente': PE, 'vendedor': C,
                'items': [(MX_M, 1)],
                'estado_final': 'En preparación', 'dias_creacion': 6,
                'transiciones': [('Registrado', 'En preparación', C, 3)],
            },
            {
                'cliente': SO, 'vendedor': A,
                'items': [(PF, 1)],
                'estado_final': 'En preparación', 'dias_creacion': 5,
                'transiciones': [('Registrado', 'En preparación', A, 2)],
            },
            {
                'cliente': AR, 'vendedor': AD,
                'items': [(CA, 1)],
                'estado_final': 'Registrado', 'dias_creacion': 2,
                'transiciones': [],
            },
        ]

        creados = 0
        for config in pedidos_config:
            cliente  = usuarios[config['cliente']]
            vendedor = usuarios[config['vendedor']]
            total    = sum(
                productos[nombre].precio_unitario * qty
                for nombre, qty in config['items']
            )

            if Pedido.objects.filter(cliente=cliente, registrado_por=vendedor, total=total).exists():
                continue

            fecha_creacion = now - timedelta(days=config['dias_creacion'])

            pedido = Pedido.objects.create(
                cliente=cliente,
                registrado_por=vendedor,
                estado=estados['Registrado'],
                total=total,
            )

            for nombre_prod, cantidad in config['items']:
                producto = productos[nombre_prod]
                PedidoProducto.objects.create(
                    pedido=pedido,
                    producto=producto,
                    cantidad=cantidad,
                    precio_unitario_snapshot=producto.precio_unitario,
                )
                producto.stock_disponible -= cantidad
                producto.stock_reservado  += cantidad
                producto.save()

            for desde, hacia, editor_email, dias_trans in config['transiciones']:
                auditoria = AuditoriaEdicionPedido.objects.create(
                    pedido=pedido,
                    editado_por=usuarios[editor_email],
                    motivo=MOTIVOS[(desde, hacia)],
                    pedido_antes={'estado_id':   estados[desde].id, 'estado': desde},
                    pedido_despues={'estado_id': estados[hacia].id, 'estado': hacia},
                )
                AuditoriaEdicionPedido.objects.filter(pk=auditoria.pk).update(
                    editado_en=now - timedelta(days=dias_trans)
                )

            pedido.estado = estados[config['estado_final']]
            pedido.save()

            # SQL directo para garantizar fechas históricas:
            # .update() sobre auto_now_add no siempre persiste en PostgreSQL.
            ultima_fecha = (
                now - timedelta(days=config['transiciones'][-1][3])
                if config['transiciones'] else fecha_creacion
            )
            with connection.cursor() as cursor:
                cursor.execute(
                    'UPDATE pedidos SET creado_en = %s, actualizado_en = %s WHERE id = %s',
                    [fecha_creacion, ultima_fecha, pedido.pk],
                )

            if config['estado_final'] == 'Completado':
                for nombre_prod, cantidad in config['items']:
                    producto = productos[nombre_prod]
                    producto.stock_reservado -= cantidad
                    producto.save()

            elif config['estado_final'] == 'Cancelado':
                for nombre_prod, cantidad in config['items']:
                    producto = productos[nombre_prod]
                    producto.stock_disponible += cantidad
                    producto.stock_reservado  -= cantidad
                    producto.save()

            creados += 1

        self.stdout.write(f'✅ Pedidos ({creados} nuevos creados)')
        self.stdout.write(self.style.SUCCESS('\n🎉 Base de datos cargada correctamente'))
