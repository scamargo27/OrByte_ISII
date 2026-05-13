from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ImportacionExterna',
            fields=[
                ('id',             models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('sistema_origen', models.CharField(max_length=100)),
                ('importado_en',   models.DateTimeField(auto_now_add=True)),
                ('pedidos',        models.JSONField()),
                ('total_pedidos',  models.PositiveIntegerField()),
                ('importado_por',  models.ForeignKey(
                                       db_column='importado_por_id',
                                       on_delete=django.db.models.deletion.PROTECT,
                                       to=settings.AUTH_USER_MODEL,
                                   )),
            ],
            options={
                'verbose_name_plural': 'importaciones externas',
                'db_table':            'importaciones_externas',
            },
        ),
    ]
