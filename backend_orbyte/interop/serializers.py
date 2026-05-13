from rest_framework import serializers


class ProductoInteropSerializer(serializers.Serializer):
    nombre          = serializers.CharField(required=False, allow_blank=True, default='')
    categoria       = serializers.CharField(required=False, allow_blank=True, default='')
    cantidad        = serializers.IntegerField(required=False, min_value=0, default=0)
    precio_unitario = serializers.DecimalField(
                          max_digits=14, decimal_places=2,
                          required=False, default=0
                      )


class PedidoInteropSerializer(serializers.Serializer):
    id_externo = serializers.CharField(required=False, allow_blank=True, default='')
    cliente    = serializers.CharField(required=False, allow_blank=True, default='')
    vendedor   = serializers.CharField(required=False, allow_blank=True, default='')
    estado     = serializers.CharField(required=False, allow_blank=True, default='')
    total      = serializers.DecimalField(
                     max_digits=14, decimal_places=2,
                     required=False, default=0
                 )
    fecha      = serializers.DateTimeField(required=False, allow_null=True, default=None)
    productos  = ProductoInteropSerializer(many=True, required=False, default=list)


class ImportarPedidosSerializer(serializers.Serializer):
    """
    Esquema estándar de interoperabilidad v1.0.

    Campos obligatorios: `sistema` y `pedidos` (lista, puede estar vacía).
    El resto es informativo y se acepta en cualquier formato.

    Ejemplo mínimo:
    {
        "sistema": "GrupoX",
        "pedidos": [
            {
                "id_externo": "42",
                "cliente": "Juan Pérez",
                "vendedor": "Ana García",
                "estado": "Completado",
                "total": 150000.00,
                "fecha": "2026-05-10T09:00:00Z",
                "productos": [
                    { "nombre": "Laptop", "categoria": "Electrónica", "cantidad": 1, "precio_unitario": 150000.00 }
                ]
            }
        ]
    }

    Cualquier campo faltante se completa con un valor vacío/nulo.
    """
    sistema      = serializers.CharField(max_length=100)
    version      = serializers.CharField(required=False, default='1.0')
    exportado_en = serializers.DateTimeField(required=False, allow_null=True, default=None)
    pedidos      = PedidoInteropSerializer(many=True)
