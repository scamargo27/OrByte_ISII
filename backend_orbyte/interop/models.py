from django.db import models
from django.conf import settings


class ImportacionExterna(models.Model):
    sistema_origen = models.CharField(max_length=100)
    importado_en   = models.DateTimeField(auto_now_add=True)
    importado_por  = models.ForeignKey(
                         settings.AUTH_USER_MODEL,
                         on_delete=models.PROTECT,
                         db_column='importado_por_id'
                     )
    pedidos        = models.JSONField()
    total_pedidos  = models.PositiveIntegerField()

    class Meta:
        db_table            = 'importaciones_externas'
        verbose_name_plural = 'importaciones externas'

    def __str__(self):
        return f'{self.sistema_origen} — {self.importado_en:%Y-%m-%d %H:%M}'
