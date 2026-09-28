const notificationForm = document.getElementById('formularioNotificacion');

if (notificationForm) {
    const recipientModeSelect = document.getElementById('notificationMode');
    const recipientInput = document.getElementById('notificationRecipient');
    const routeSelect = document.getElementById('notificationRoute');
    const userSelect = document.getElementById('notificationUser');
    const routeTargetField = document.getElementById('routeTargetField');
    const userTargetField = document.getElementById('userTargetField');
    const typeSelect = document.getElementById('notificationType');
    const titleInput = document.getElementById('notificationTitle');
    const messageInput = document.getElementById('notificationBody');
    const pushNotification = document.querySelector('.push-notification');
    const sendSummary = document.querySelector('.send-summary');
    const deviceRecipientNote = document.querySelector('.device-recipient-note');
    const previewTitle = document.getElementById('previewTitle');
    const previewMessage = document.getElementById('previewBody');
    const titleCounter = document.getElementById('titleCounter');
    const messageCounter = document.getElementById('bodyCounter');
    const summaryRecipient = document.getElementById('summaryRecipient');
    const summaryType = document.getElementById('summaryType');
    const summaryTypeIcon = document.getElementById('summaryTypeIcon');
    const previewTypeBadge = document.getElementById('previewTypeBadge');
    const previewTypeIcon = document.getElementById('previewTypeIcon');
    const previewTypeLabel = document.getElementById('previewTypeLabel');
    const summaryDevices = document.getElementById('summaryDevices');
    const recipientDeviceMessage = document.getElementById('recipientDeviceMessage');
    const deviceCountsElement = document.getElementById('notificationDeviceCounts');
    const deviceCounts = deviceCountsElement
        ? JSON.parse(deviceCountsElement.textContent)
        : {};
    const notificationTypes = {
        alerta: { label: 'Alerta', icon: 'fa-triangle-exclamation', className: 'type-alerta' },
        novedades: { label: 'Novedades', icon: 'fa-newspaper', className: 'type-novedades' },
        emergencia: { label: 'Emergencia', icon: 'fa-kit-medical', className: 'type-emergencia' },
    };

    const updateTextPreview = () => {
        const title = titleInput.value.trim();
        const message = messageInput.value.trim();
        const notificationType = notificationTypes[typeSelect.value];

        previewTitle.textContent = title || (notificationType ? `Nuevo aviso: ${notificationType.label}` : '');
        previewMessage.textContent = message || (notificationType
            ? `El mensaje de ${notificationType.label.toLowerCase()} aparecerá aquí.`
            : '');
        titleCounter.textContent = `${titleInput.value.length}/${titleInput.maxLength}`;
        messageCounter.textContent = `${messageInput.value.length}/${messageInput.maxLength}`;
        updateSummary();
    };

    const updateSummary = () => {
        const hasContent = Boolean(typeSelect.value || titleInput.value.trim() || messageInput.value.trim());
        const recipientValue = recipientInput.value;
        const recipientName = recipientValue === 'all'
            ? 'Todos los usuarios'
            : recipientValue.startsWith('route:')
                ? `Ruta ${routeSelect.selectedOptions[0]?.textContent.trim() || ''}`
                : recipientValue.startsWith('user:')
                    ? userSelect.selectedOptions[0]?.textContent.trim() || ''
                    : 'Selecciona destino';
        const notificationType = notificationTypes[typeSelect.value];
        const recipientCount = recipientValue
            ? Number(deviceCounts[recipientValue] || 0)
            : null;
        const formattedCount = recipientCount === null
            ? '—'
            : new Intl.NumberFormat('en-US').format(recipientCount);
        const recipientCountLabel = recipientCount === 1
            ? 'dispositivo suscrito'
            : 'dispositivos suscritos';

        pushNotification.hidden = !hasContent;
        sendSummary.hidden = !hasContent;
        deviceRecipientNote.hidden = recipientCount === null;
        summaryRecipient.textContent = recipientName;
        summaryType.textContent = notificationType?.label || 'Selecciona tipo de aviso';
        summaryTypeIcon.className = notificationType
            ? `fas ${notificationType.icon} type-icon-${typeSelect.value}`
            : 'fas fa-tag type-icon-other';
        previewTypeBadge.hidden = !notificationType;
        previewTypeBadge.className = `push-type-indicator ${notificationType?.className || 'type-other'}`;
        previewTypeIcon.className = `fas ${notificationType?.icon || 'fa-tag'}`;
        previewTypeLabel.textContent = notificationType?.label || 'Selecciona tipo de aviso';
        summaryDevices.textContent = recipientCount === null ? '—' : `${formattedCount} suscritos`;
        recipientDeviceMessage.textContent = recipientCount === null
            ? 'Selecciona una ruta o usuario para ver los dispositivos.'
            : recipientValue.startsWith('route:')
                ? `Se enviará a ${formattedCount} ${recipientCountLabel} a esta ruta.`
                : `Se enviará a ${formattedCount} ${recipientCountLabel}.`;
    };

    const updateRecipientSelection = () => {
        const mode = recipientModeSelect.value;
        routeTargetField.hidden = mode !== 'route';
        userTargetField.hidden = mode !== 'user';
        routeSelect.required = mode === 'route';
        userSelect.required = mode === 'user';

        if (mode === 'all') {
            recipientInput.value = 'all';
        } else if (mode === 'route' && routeSelect.value) {
            recipientInput.value = `route:${routeSelect.value}`;
        } else if (mode === 'user' && userSelect.value) {
            recipientInput.value = `user:${userSelect.value}`;
        } else {
            recipientInput.value = '';
        }

        updateSummary();
    };

    titleInput.addEventListener('input', updateTextPreview);
    messageInput.addEventListener('input', updateTextPreview);
    recipientModeSelect.addEventListener('change', updateRecipientSelection);
    routeSelect.addEventListener('change', updateRecipientSelection);
    userSelect.addEventListener('change', updateRecipientSelection);
    typeSelect.addEventListener('change', updateTextPreview);

    notificationForm.addEventListener('reset', () => {
        window.setTimeout(() => {
            updateRecipientSelection();
            updateTextPreview();
        }, 0);
    });

    updateRecipientSelection();
    updateTextPreview();
}

const phoneClock = document.getElementById('phoneClock');
const phoneStatusTime = document.getElementById('phoneStatusTime');
const phoneDate = document.getElementById('phoneDate');

if (phoneClock && phoneStatusTime && phoneDate) {
    let internetTimestamp = null;
    let performanceAtSync = 0;

    const updateInternetClock = () => {
        if (internetTimestamp === null) {
            return;
        }

        const currentTime = new Date(internetTimestamp + performance.now() - performanceAtSync);
        const timeText = new Intl.DateTimeFormat('es-NI', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'UTC',
        }).format(currentTime);

        phoneClock.textContent = timeText;
        phoneStatusTime.textContent = timeText;
        phoneDate.textContent = new Intl.DateTimeFormat('es-NI', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            timeZone: 'UTC',
        }).format(currentTime);
    };

    const syncInternetClock = async () => {
        try {
            const response = await fetch(
                'https://timeapi.io/api/Time/current/zone?timeZone=America%2FManagua',
                { cache: 'no-store' }
            );

            if (!response.ok) {
                throw new Error('No se pudo sincronizar la hora.');
            }

            const result = await response.json();
            if (result.timeZone !== 'America/Managua' || !result.dateTime) {
                throw new Error('La fuente de hora devolvió una zona inesperada.');
            }

            const [datePart, timePart] = result.dateTime.split('T');
            const [year, month, day] = datePart.split('-').map(Number);
            const [hour, minute, second] = timePart.split('.')[0].split(':').map(Number);
            internetTimestamp = Date.UTC(year, month - 1, day, hour, minute, second);
            performanceAtSync = performance.now();

            if (!Number.isFinite(internetTimestamp)) {
                throw new Error('La fuente de hora devolvió una fecha inválida.');
            }

            phoneDate.title = 'Hora sincronizada por Internet: America/Managua';
            updateInternetClock();
        } catch (error) {
            internetTimestamp = null;
            phoneClock.textContent = '--:--';
            phoneStatusTime.textContent = '--:--';
            phoneDate.textContent = 'Hora de Internet no disponible';
            console.error('Sincronización de hora:', error);
        }
    };

    syncInternetClock();
    window.setInterval(updateInternetClock, 1000);
    window.setInterval(syncInternetClock, 5 * 60 * 1000);
}