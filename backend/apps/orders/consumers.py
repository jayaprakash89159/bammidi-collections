"""
WebSocket consumer for real-time order tracking.
Customers connect to their order's channel and receive live updates
when delivery partner updates order status.
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async


class OrderTrackingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.order_id = self.scope['url_route']['kwargs']['order_id']
        self.room_group_name = f'order_{self.order_id}'

        # Verify the user has access to this order
        user = self.scope.get('user')
        if not user or not user.is_authenticated:
            await self.close(code=4001)
            return

        has_access = await self.verify_access(user, self.order_id)
        if not has_access:
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        # Send current order status on connect
        order_data = await self.get_order_data(self.order_id)
        if order_data:
            await self.send(text_data=json.dumps({
                'type': 'order_status',
                'data': order_data
            }))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        """Handle ping messages from client"""
        data = json.loads(text_data)
        if data.get('type') == 'ping':
            await self.send(text_data=json.dumps({'type': 'pong'}))

    async def order_update(self, event):
        """Receive order update from channel layer and forward to WebSocket client"""
        await self.send(text_data=json.dumps({
            'type': 'order_update',
            'status': event['status'],
            'order_id': event['order_id'],
            'message': event.get('message', ''),
            'latitude': event.get('latitude'),
            'longitude': event.get('longitude'),
            'timestamp': event.get('timestamp'),
        }))

    @database_sync_to_async
    def verify_access(self, user, order_id):
        from apps.orders.models import Order
        from apps.users.models import User
        try:
            order = Order.objects.get(id=order_id)
            # Allow customer, admin, or assigned delivery partner
            if user.role == User.ADMIN:
                return True
            if order.user_id == user.id:
                return True
            if hasattr(user, 'delivery_profile'):
                return DeliveryAssignment.objects.filter(
                    order=order, delivery_partner__user=user
                ).exists()
        except Order.DoesNotExist:
            return False
        return False

    @database_sync_to_async
    def get_order_data(self, order_id):
        from apps.orders.models import Order
        from apps.orders.serializers import OrderSerializer
        try:
            order = Order.objects.get(id=order_id)
            return OrderSerializer(order).data
        except Order.DoesNotExist:
            return None
