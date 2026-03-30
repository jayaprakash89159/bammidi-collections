from django.contrib import admin
from .models import Category, Product, Inventory


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'is_active', 'sort_order')
    list_editable = ('is_active', 'sort_order')
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ('name',)


class InventoryInline(admin.StackedInline):
    model = Inventory
    extra = 1


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'price', 'mrp', 'discount_percentage', 'is_active', 'is_featured', 'is_new_arrival', 'current_stock')
    list_editable = ('is_active', 'is_featured', 'is_new_arrival')
    list_filter = ('category', 'is_active', 'is_featured', 'is_new_arrival', 'occasion', 'fabric')
    search_fields = ('name', 'tags', 'fabric', 'color')
    prepopulated_fields = {'slug': ('name',)}
    inlines = [InventoryInline]
    fieldsets = (
        ('Basic Info', {'fields': ('category', 'name', 'slug', 'description', 'image', 'additional_images')}),
        ('Pricing', {'fields': ('price', 'mrp')}),
        ('Fashion Details', {'fields': ('fabric', 'color', 'available_sizes', 'occasion', 'care_instructions')}),
        ('Meta', {'fields': ('brand', 'tags', 'is_active', 'is_featured', 'is_new_arrival')}),
    )
