const historyBody = document.getElementById('notificationHistoryBody');
const historyToggle = document.getElementById('toggleNotificationHistory');

if (historyBody && historyToggle) {
    let historyEntries = Array.from(historyBody.querySelectorAll('[data-history-entry]'));
    let showAllHistory = false;

    const updateHistoryVisibility = () => {
        historyEntries.forEach((entry, index) => {
            entry.hidden = !showAllHistory && index >= 5;
            entry.nextElementSibling.hidden = true;
            entry.querySelector('[data-history-message]').setAttribute('aria-expanded', 'false');
        });

        historyToggle.hidden = historyEntries.length <= 5;
        historyToggle.setAttribute('aria-expanded', String(showAllHistory));
        historyToggle.querySelector('span').textContent = showAllHistory ? 'Ver menos' : 'Ver todos';
    };

    const createCell = (text, className = '') => {
        const cell = document.createElement('td');
        cell.textContent = text || '';
        if (className) {
            cell.className = className;
        }
        return cell;
    };

    const createHistoryEntry = (record) => {
        const row = document.createElement('tr');
        row.className = 'history-entry';
        row.dataset.historyEntry = '';

        const dateCell = document.createElement('td');
        const date = document.createElement('time');
        date.dateTime = record.sent_at_iso || '';
        date.textContent = record.sent_at_label || '';
        dateCell.append(date);
        row.append(dateCell);
        row.append(createCell(record.recipient_label));
        row.append(createCell(record.title, 'history-title'));

        const typeCell = document.createElement('td');
        const type = document.createElement('span');
        type.className = `history-type ${record.notification_type_class || ''}`;
        const typeIcon = document.createElement('i');
        typeIcon.className = `fas ${record.notification_type_icon || 'fa-tag'}`;
        typeIcon.setAttribute('aria-hidden', 'true');
        type.append(typeIcon, document.createTextNode(record.notification_type_label || record.notification_type || 'Novedades'));
        typeCell.append(type);
        row.append(typeCell);

        const channelCell = document.createElement('td');
        const channel = document.createElement('span');
        channel.className = 'history-channel';
        const channelIcon = document.createElement('i');
        channelIcon.className = 'fas fa-mobile-screen-button';
        channelIcon.setAttribute('aria-hidden', 'true');
        channel.append(channelIcon, document.createTextNode(record.channel || 'Push (Firebase)'));
        channelCell.append(channel);
        row.append(channelCell);

        const statusCell = document.createElement('td');
        const status = document.createElement('span');
        const statusClasses = { Enviada: 'status-sent', Parcial: 'status-partial', Fallida: 'status-failed' };
        status.className = `history-status ${statusClasses[record.status] || 'status-failed'}`;
        const statusDot = document.createElement('i');
        statusDot.setAttribute('aria-hidden', 'true');
        status.append(statusDot, document.createTextNode(record.status || 'Fallida'));
        statusCell.append(status);
        row.append(statusCell);

        const actionCell = document.createElement('td');
        const action = document.createElement('button');
        action.className = 'history-action';
        action.type = 'button';
        action.dataset.historyMessage = '';
        action.setAttribute('aria-label', `Ver mensaje: ${record.title || ''}`);
        action.setAttribute('aria-expanded', 'false');
        const actionIcon = document.createElement('i');
        actionIcon.className = 'fas fa-ellipsis';
        actionIcon.setAttribute('aria-hidden', 'true');
        action.append(actionIcon);
        actionCell.append(action);
        row.append(actionCell);

        const messageRow = document.createElement('tr');
        messageRow.className = 'history-message-row';
        messageRow.hidden = true;
        const messageCell = document.createElement('td');
        messageCell.colSpan = 7;
        const messageLabel = document.createElement('strong');
        messageLabel.textContent = 'Mensaje: ';
        messageCell.append(messageLabel, document.createTextNode(record.message || ''));
        messageRow.append(messageCell);

        return { row, messageRow };
    };

    const addHistoryEntry = (record) => {
        historyBody.querySelector('.history-empty')?.remove();
        const entry = createHistoryEntry(record);
        historyBody.prepend(entry.messageRow);
        historyBody.prepend(entry.row);
        historyEntries.unshift(entry.row);

        if (historyEntries.length > 50) {
            const oldest = historyEntries.pop();
            oldest.nextElementSibling.remove();
            oldest.remove();
        }

        updateHistoryVisibility();
    };

    historyToggle.addEventListener('click', () => {
        showAllHistory = !showAllHistory;
        updateHistoryVisibility();
    });

    historyBody.addEventListener('click', (event) => {
        const action = event.target.closest('[data-history-message]');
        if (!action) {
            return;
        }

        const messageRow = action.closest('tr').nextElementSibling;
        const expanded = action.getAttribute('aria-expanded') === 'true';
        action.setAttribute('aria-expanded', String(!expanded));
        messageRow.hidden = expanded;
    });

    document.addEventListener('notification-history:added', (event) => {
        addHistoryEntry(event.detail);
    });

    updateHistoryVisibility();
}