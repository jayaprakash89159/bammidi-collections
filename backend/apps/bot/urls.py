from django.urls import path
from . import views

urlpatterns = [
    path('chat/', views.bot_chat, name='bot-chat'),
]
