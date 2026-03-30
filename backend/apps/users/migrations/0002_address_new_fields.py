from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='address',
            name='house_no',
            field=models.CharField(blank=True, help_text='House/Flat/Door number', max_length=50),
        ),
        migrations.AddField(
            model_name='address',
            name='building_street',
            field=models.CharField(blank=True, help_text='Building name / Street / Area', max_length=255),
        ),
        migrations.AddField(
            model_name='address',
            name='landmark',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AlterField(
            model_name='address',
            name='street',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AlterField(
            model_name='address',
            name='city',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AlterField(
            model_name='address',
            name='state',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AlterField(
            model_name='address',
            name='pincode',
            field=models.CharField(blank=True, max_length=10),
        ),
    ]
