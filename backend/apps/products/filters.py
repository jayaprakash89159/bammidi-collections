import django_filters
from .models import Product


class ProductFilter(django_filters.FilterSet):
    min_price = django_filters.NumberFilter(field_name='price', lookup_expr='gte')
    max_price = django_filters.NumberFilter(field_name='price', lookup_expr='lte')
    category = django_filters.CharFilter(field_name='category__slug')
    in_stock = django_filters.BooleanFilter(method='filter_in_stock')
    fabric = django_filters.CharFilter(field_name='fabric', lookup_expr='icontains')
    occasion = django_filters.CharFilter(field_name='occasion', lookup_expr='icontains')

    class Meta:
        model = Product
        fields = ['category', 'is_featured', 'is_new_arrival', 'brand', 'fabric', 'occasion']

    def filter_in_stock(self, queryset, name, value):
        if value:
            return queryset.filter(inventory__quantity__gt=0)
        return queryset
