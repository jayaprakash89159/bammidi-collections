"""
Product and Inventory models for Bammidi Collections.
Ladies ethnic & western fashion: sarees, blouses, dresses, nightwear, etc.
"""
from django.db import models
from django.core.validators import MinValueValidator


class Category(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    image = models.ImageField(upload_to='categories/', null=True, blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'categories'
        verbose_name_plural = 'Categories'
        ordering = ['sort_order', 'name']

    def __str__(self):
        return self.name


class Product(models.Model):
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='products')
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='products/')
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    mrp = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    unit = models.CharField(max_length=50, default='1 pc', blank=True)  # kept for migration compatibility
    brand = models.CharField(max_length=100, blank=True)
    tags = models.CharField(max_length=500, blank=True)
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    # Fashion-specific fields (added in migration 0002)
    additional_images = models.JSONField(default=list, blank=True)
    fabric = models.CharField(max_length=100, blank=True)
    color = models.CharField(max_length=100, blank=True)
    available_sizes = models.JSONField(default=list, blank=True)
    care_instructions = models.TextField(blank=True)
    occasion = models.CharField(max_length=100, blank=True)
    is_new_arrival = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'products'
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    @property
    def discount_percentage(self):
        if self.mrp > self.price:
            return round(((self.mrp - self.price) / self.mrp) * 100)
        return 0

    @property
    def current_stock(self):
        try:
            return self.inventory.quantity
        except Inventory.DoesNotExist:
            return 0

    @property
    def is_in_stock(self):
        return self.current_stock > 0


class Inventory(models.Model):
    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name='inventory')
    quantity = models.PositiveIntegerField(default=0)
    reserved_quantity = models.PositiveIntegerField(default=0)
    low_stock_threshold = models.PositiveIntegerField(default=5)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'inventory'
        verbose_name_plural = 'Inventories'

    def __str__(self):
        return f"{self.product.name} - {self.quantity} units"

    @property
    def available_quantity(self):
        return max(0, self.quantity - self.reserved_quantity)

    @property
    def is_low_stock(self):
        return self.available_quantity <= self.low_stock_threshold

    def reserve(self, quantity):
        from django.db import transaction
        with transaction.atomic():
            inv = Inventory.objects.select_for_update().get(pk=self.pk)
            if inv.available_quantity < quantity:
                raise ValueError(f"Insufficient stock for {self.product.name}")
            inv.reserved_quantity += quantity
            inv.save()
            return True

    def confirm_sale(self, quantity):
        from django.db import transaction
        with transaction.atomic():
            inv = Inventory.objects.select_for_update().get(pk=self.pk)
            inv.quantity -= quantity
            inv.reserved_quantity -= quantity
            inv.save()

    def release_reservation(self, quantity):
        from django.db import transaction
        with transaction.atomic():
            inv = Inventory.objects.select_for_update().get(pk=self.pk)
            inv.reserved_quantity = max(0, inv.reserved_quantity - quantity)
            inv.save()
