from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('orders', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='DeliveryPartner',
            fields=[
                ('id', models.BigAutoField(primary_key=True, serialize=False)),
                ('vehicle_type', models.CharField(default='Bike', max_length=50)),
                ('vehicle_number', models.CharField(blank=True, max_length=20)),
                ('is_available', models.BooleanField(default=True)),
                ('is_active', models.BooleanField(default=True)),
                ('current_latitude', models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ('current_longitude', models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ('total_deliveries', models.PositiveIntegerField(default=0)),
                ('rating', models.DecimalField(decimal_places=2, default=5.0, max_digits=3)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='delivery_profile', to=settings.AUTH_USER_MODEL)),
            ],
            options={'db_table': 'delivery_partners'},
        ),
        migrations.CreateModel(
            name='DeliveryAssignment',
            fields=[
                ('id', models.BigAutoField(primary_key=True, serialize=False)),
                ('status', models.CharField(
                    choices=[('assigned','Assigned'),('accepted','Accepted'),('picked_up','Picked Up'),
                             ('out_for_delivery','Out for Delivery'),('delivered','Delivered'),('rejected','Rejected')],
                    default='assigned', max_length=20,
                )),
                ('assigned_at', models.DateTimeField(auto_now_add=True)),
                ('accepted_at', models.DateTimeField(blank=True, null=True)),
                ('picked_up_at', models.DateTimeField(blank=True, null=True)),
                ('delivered_at', models.DateTimeField(blank=True, null=True)),
                ('estimated_delivery', models.DateTimeField(blank=True, null=True)),
                ('partner_notes', models.TextField(blank=True)),
                ('order', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='delivery_assignment', to='orders.order')),
                ('delivery_partner', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to='delivery.deliverypartner')),
            ],
            options={'db_table': 'delivery_assignments'},
        ),
    ]
