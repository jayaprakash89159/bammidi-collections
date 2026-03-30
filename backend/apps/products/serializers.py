import json
from rest_framework import serializers
from .models import Category, Product, Inventory


class FlexibleSizesField(serializers.Field):
    """
    Accepts available_sizes in ANY format and always returns a list of strings:
      - Python list            → used as-is
      - Valid JSON string      → parsed
      - Comma-separated string → split
      - Empty string / None    → []
    This completely bypasses DRF's JSONField validator which rejects plain strings.
    """
    def to_representation(self, value):
        if isinstance(value, list):
            return value
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                return parsed if isinstance(parsed, list) else [parsed]
            except (json.JSONDecodeError, ValueError):
                return [s.strip() for s in value.split(',') if s.strip()]
        return []

    def to_internal_value(self, data):
        if isinstance(data, list):
            return [str(s).strip() for s in data if str(s).strip()]
        if isinstance(data, str):
            stripped = data.strip()
            if not stripped:
                return []
            try:
                parsed = json.loads(stripped)
                if isinstance(parsed, list):
                    return [str(s).strip() for s in parsed if str(s).strip()]
                return [str(parsed).strip()]
            except (json.JSONDecodeError, ValueError):
                return [s.strip() for s in stripped.split(',') if s.strip()]
        return []


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'image', 'description', 'sort_order']


class InventorySerializer(serializers.ModelSerializer):
    available_quantity = serializers.ReadOnlyField()
    is_low_stock = serializers.ReadOnlyField()

    class Meta:
        model = Inventory
        fields = ['quantity', 'available_quantity', 'reserved_quantity', 'is_low_stock', 'low_stock_threshold']


class ProductListSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    discount_percentage = serializers.ReadOnlyField()
    is_in_stock = serializers.ReadOnlyField()
    current_stock = serializers.ReadOnlyField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'image', 'price', 'mrp',
            'brand', 'category', 'discount_percentage',
            'is_in_stock', 'current_stock', 'is_featured',
            'is_new_arrival', 'fabric', 'color', 'occasion',
        ]


class ProductDetailSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    inventory = InventorySerializer(read_only=True)
    discount_percentage = serializers.ReadOnlyField()
    is_in_stock = serializers.ReadOnlyField()
    current_stock = serializers.ReadOnlyField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'description', 'image', 'additional_images',
            'price', 'mrp', 'brand', 'category', 'inventory',
            'discount_percentage', 'is_in_stock', 'current_stock',
            'is_featured', 'is_new_arrival',
            'fabric', 'color', 'available_sizes', 'care_instructions', 'occasion',
            'tags', 'is_active', 'created_at',
        ]


class ProductCreateUpdateSerializer(serializers.ModelSerializer):
    stock_quantity = serializers.IntegerField(write_only=True, required=False, default=0)
    # Use our custom field so "S, M, L" and ["S","M","L"] both work
    available_sizes = FlexibleSizesField(required=False, default=list)

    class Meta:
        model = Product
        fields = [
            'name', 'slug', 'category', 'description', 'image', 'additional_images',
            'price', 'mrp', 'brand', 'tags', 'fabric', 'color',
            'available_sizes', 'care_instructions', 'occasion',
            'is_active', 'is_featured', 'is_new_arrival', 'stock_quantity',
        ]

    def create(self, validated_data):
        stock_quantity = validated_data.pop('stock_quantity', 0)
        product = super().create(validated_data)
        Inventory.objects.create(product=product, quantity=stock_quantity)
        return product

    def update(self, instance, validated_data):
        stock_quantity = validated_data.pop('stock_quantity', None)
        product = super().update(instance, validated_data)
        if stock_quantity is not None:
            inventory, _ = Inventory.objects.get_or_create(product=product)
            inventory.quantity = stock_quantity
            inventory.save()
        return product
