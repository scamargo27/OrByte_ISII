from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0002_usuario_groups_usuario_user_permissions_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='usuario',
            name='cedula',
            field=models.CharField(max_length=20, null=True, unique=True),
        ),
    ]
