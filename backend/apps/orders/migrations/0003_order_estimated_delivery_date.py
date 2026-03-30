from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0002_order_awb_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='estimated_delivery_date',
            field=models.DateField(null=True, blank=True),
        ),
    ]
