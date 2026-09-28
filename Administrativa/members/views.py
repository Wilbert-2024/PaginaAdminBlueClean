import logging
from zoneinfo import ZoneInfo

from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.http import require_POST
from firebase_admin import auth, messaging
from google.cloud import firestore

from .firebase_config import db

logger = logging.getLogger(__name__)

NOTIFICATION_TYPES = {
    'alerta': {
        'label': 'Alerta',
        'icon': 'fa-triangle-exclamation',
        'class': 'type-alerta',
    },
    'novedades': {
        'label': 'Novedades',
        'icon': 'fa-newspaper',
        'class': 'type-novedades',
    },
    'emergencia': {
        'label': 'Emergencia',
        'icon': 'fa-kit-medical',
        'class': 'type-emergencia',
    },
}

LEGACY_NOTIFICATION_TYPES = {
    'cambio de ruta': 'alerta',
    'retraso del servicio': 'alerta',
    'mantenimiento': 'novedades',
    'aviso general': 'novedades',
    'topic': 'novedades',
}


def _normalize_notification_type(value):
    notification_type = str(value or '').strip().lower()
    return LEGACY_NOTIFICATION_TYPES.get(notification_type, notification_type)


def _notification_type_presentation(value):
    notification_type = _normalize_notification_type(value)
    presentation = NOTIFICATION_TYPES.get(notification_type)
    if presentation:
        return {
            'notification_type': notification_type,
            'notification_type_label': presentation['label'],
            'notification_type_icon': presentation['icon'],
            'notification_type_class': presentation['class'],
        }

    legacy_label = str(value or '').strip() or 'Novedades'
    return {
        'notification_type': notification_type,
        'notification_type_label': legacy_label,
        'notification_type_icon': 'fa-tag',
        'notification_type_class': 'type-other',
    }


def _firebase_user(request):
    authorization = request.headers.get('Authorization', '')

    if not authorization.startswith('Bearer '):
        return None

    try:
        return auth.verify_id_token(authorization[7:])
    except Exception:
        return None


def Login(request):
    return render(request, 'login.html')


def _notification_recipients():
    usuarios = set()
    rutas = set()
    dispositivos = {'all': set()}

    for document in db.collection('DatosUser').stream():
        data = document.to_dict()
        if data.get('User'):
            usuarios.add(data['User'])
        if data.get('RutaId'):
            rutas.add(data['RutaId'])

        token = data.get('Token')
        if token:
            dispositivos['all'].add(token)
            if data.get('User'):
                dispositivos.setdefault(f"user:{data['User']}", set()).add(token)
            if data.get('RutaId'):
                dispositivos.setdefault(f"route:{data['RutaId']}", set()).add(token)

    for document in db.collection('fcm_tokens').stream():
        data = document.to_dict()
        token = data.get('token') or document.id
        if token:
            dispositivos['all'].add(token)

    return {
        'usuarios_notificaciones': sorted(usuarios),
        'rutas_notificaciones': sorted(rutas),
        'dispositivos_por_destinatario': {
            destinatario: len(tokens)
            for destinatario, tokens in dispositivos.items()
        },
    }


def Dashboard(request):
    return render(request, 'dashboard.html', {'active_nav': 'dashboard'})


def Mapa(request):
    nombres_rutas = []
    referencias = []

    for document in db.collection('NombresRutas').stream():
        data = document.to_dict()
        if data.get('Activo') is not True:
            continue

        nombres_rutas.append({
            'id': document.id,
            'nombre': data.get('Nombre') or document.id,
        })

        coordenadas = data.get('Coordenadas') or {}
        punto_inicio = coordenadas.get('Inicia')
        punto_final = coordenadas.get('Final')

        if not punto_inicio or not punto_final:
            referencias.append(None)
            continue

        referencias.append({
            'nombre': document.id,
            'inicio': {
                'lat': punto_inicio.latitude,
                'lng': punto_inicio.longitude,
            },
            'final': {
                'lat': punto_final.latitude,
                'lng': punto_final.longitude,
            },
        })

    return render(request, 'Mapa.html', {
        'active_nav': 'Mapa',
        'nombres_rutas': nombres_rutas,
        'referencias': referencias,
    })


def NotificationCenter(request):
    context = _notification_recipients()
    context['active_nav'] = 'notifications'
    context['historial_notificaciones'] = _notification_history()
    return render(request, 'notificaciones.html', context)


def _format_history_timestamp(value):
    if not value:
        return '', ''

    local_time = value.astimezone(ZoneInfo('America/Managua'))
    month_names = ('ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic')
    label = f'{local_time.day:02d} {month_names[local_time.month - 1]} {local_time.year} {local_time:%H:%M}'
    return label, local_time.isoformat()


def _notification_history():
    history = []
    status_classes = {'Enviada': 'sent', 'Parcial': 'partial', 'Fallida': 'failed'}

    documents = (
        db.collection('Notificaciones')
        .order_by('fecha', direction=firestore.Query.DESCENDING)
        .limit(50)
        .stream()
    )

    for document in documents:
        data = document.to_dict()
        sent_at_label, sent_at_iso = _format_history_timestamp(data.get('fecha'))
        status = data.get('estado') or ('Enviada' if data.get('enviado') else 'Fallida')
        type_presentation = _notification_type_presentation(data.get('tipo'))
        recipient_label = data.get('Destino', 'Todos los usuarios')
        if recipient_label.lower() in ('all', 'todos', 'todos los usuarios'):
            recipient_label = 'Todos los usuarios'
        history.append({
            'id': document.id,
            'sent_at_label': sent_at_label,
            'sent_at_iso': sent_at_iso,
            'recipient_label': recipient_label,
            'title': data.get('Titulo', ''),
            'message': data.get('Mensaje', ''),
            'channel': data.get('canal', 'Push (Firebase)'),
            'status': status,
            'status_class': status_classes.get(status, 'failed'),
            **type_presentation,
        })

    return history


def _notification_tokens(recipient='all'):
    tokens = set()

    if recipient != 'all' and not recipient.startswith(('user:', 'route:')):
        return []

    for document in db.collection('DatosUser').stream():
        data = document.to_dict()
        if recipient.startswith('user:') and data.get('User') != recipient[5:]:
            continue
        if recipient.startswith('route:') and data.get('RutaId') != recipient[6:]:
            continue

        token = data.get('Token')
        if token:
            tokens.add(token)

    if recipient == 'all':
        for document in db.collection('fcm_tokens').stream():
            token = document.to_dict().get('token') or document.id
            if token:
                tokens.add(token)

    return list(tokens)


@require_POST
def register_notification_token(request):
    if not _firebase_user(request):
        return JsonResponse({'error': 'Sesión no autorizada.'}, status=401)

    token = request.POST.get('token', '').strip()

    if not token:
        return JsonResponse({'error': 'Token requerido.'}, status=400)

    db.collection('fcm_tokens').document(token).set({
        'token': token,
        'updated_at': firestore.SERVER_TIMESTAMP,
    }, merge=True)

    return JsonResponse({'ok': True})


@require_POST
def send_notification(request):
    if not _firebase_user(request):
        return JsonResponse({'error': 'Sesión no autorizada.'}, status=401)

    title = request.POST.get('title', '').strip()
    body = request.POST.get('body', '').strip()
    recipient = request.POST.get('recipient', 'all').strip()
    notification_type = _normalize_notification_type(
        request.POST.get('notification_type', 'novedades')
    ) or 'novedades'

    if notification_type not in NOTIFICATION_TYPES:
        return JsonResponse({'error': 'Selecciona un tipo de notificación válido.'}, status=400)

    if not title or not body:
        return JsonResponse({'error': 'El título y el mensaje son obligatorios.'}, status=400)

    tokens = _notification_tokens(recipient)

    if not tokens:
        return JsonResponse({'error': 'No hay navegadores suscritos a notificaciones.'}, status=400)

    sent = 0
    failed = 0

    for start in range(0, len(tokens), 500):
        batch = tokens[start:start + 500]
        response = messaging.send_each_for_multicast(
            messaging.MulticastMessage(
                notification=messaging.Notification(title=title, body=body),
                data={'tipo': notification_type},
                tokens=batch,
            )
        )
        sent += response.success_count
        failed += response.failure_count

    status = 'Enviada' if not failed else 'Parcial' if sent else 'Fallida'
    if recipient == 'all':
        recipient_label = 'Todos los usuarios'
    elif recipient.startswith('route:'):
        recipient_label = f'Ruta {recipient[6:]}'
    else:
        recipient_label = f'Usuario {recipient[5:]}'

    history_reference = db.collection('Notificaciones').document()
    type_presentation = _notification_type_presentation(notification_type)
    history_data = {
        'Titulo': title,
        'Mensaje': body,
        'Destino': recipient_label,
        'tipo': notification_type,
        'canal': 'Push (Firebase)',
        'enviado': sent > 0,
        'estado': status,
        'enviados': sent,
        'fallidos': failed,
        'total': len(tokens),
        'fecha': firestore.SERVER_TIMESTAMP,
    }

    try:
        history_reference.set(history_data)
        saved_history = history_reference.get().to_dict()
    except Exception:
        logger.exception('Firebase sent the notification but its history could not be saved.')
        return JsonResponse({
            'ok': True,
            'sent': sent,
            'failed': failed,
            'total': len(tokens),
            'history_saved': False,
        })

    sent_at_label, sent_at_iso = _format_history_timestamp(saved_history.get('fecha'))
    history_record = {
        'id': history_reference.id,
        'sent_at_label': sent_at_label,
        'sent_at_iso': sent_at_iso,
        'recipient_label': recipient_label,
        'title': title,
        'message': body,
        'channel': 'Push (Firebase)',
        'status': status,
        'status_class': 'sent' if status == 'Enviada' else 'partial' if status == 'Parcial' else 'failed',
        **type_presentation,
    }

    return JsonResponse({
        'ok': True,
        'sent': sent,
        'failed': failed,
        'total': len(tokens),
        'history_saved': True,
        'history_record': history_record,
    })
