from django.urls import path
from .views import Dashboard, Login, Mapa, NotificationCenter, register_notification_token, send_notification

urlpatterns = [
    path('', Login, name='login'),
    path('dashboard/', Dashboard, name='dashboard'),
    path('mapa/', Mapa, name='Mapa'),
    path('notificaciones/', NotificationCenter, name='notifications'),
    path('notifications/token/', register_notification_token, name='register_notification_token'),
    path('notifications/send/', send_notification, name='send_notification'),
]
