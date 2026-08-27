// Client-side Service Worker Alarm Scheduler & Notification Bridge
import { playTaskAlarmRingtone } from './messengerSound';

/**
 * Send a message to the active Service Worker
 */
export async function sendSWMessage(messageData) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    if (registration && registration.active) {
      registration.active.postMessage(messageData);
      return true;
    } else if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(messageData);
      return true;
    }
  } catch (err) {
    console.warn('[AlarmScheduler] Failed to send message to SW:', err);
  }
  return false;
}

/**
 * Register or update a single scheduled alarm with the Service Worker
 */
export async function scheduleServiceWorkerAlarm(alarm) {
  if (!alarm || !alarm.id) return;
  return sendSWMessage({
    type: 'SCHEDULE_ALARM',
    alarm: {
      id: String(alarm.id),
      title: alarm.title || 'নির্ধারিত টাস্ক',
      description: alarm.description || '',
      category: alarm.category || 'সাধারণ',
      priority: alarm.priority || 'মাঝারি',
      dateTime: alarm.dateTime || alarm.due_date,
      due_date: alarm.due_date || alarm.dateTime,
      room: alarm.room || 'general',
      createdByName: alarm.createdByName || '',
      url: alarm.url || '/tasks',
      isTriggered: !!alarm.isTriggered
    }
  });
}

/**
 * Bulk sync all pending tasks/alarms with the Service Worker IndexedDB
 */
export async function syncAllAlarmsWithServiceWorker(tasksOrAlerts = []) {
  const formattedAlarms = tasksOrAlerts
    .filter((item) => {
      if (item.status && item.status === 'Completed') return false;
      if (item.alerted) return false;
      if (item.isTriggered) return false;
      return true;
    })
    .map((item) => ({
      id: String(item.id),
      title: item.title || 'নির্ধারিত টাস্ক',
      description: item.description || '',
      category: item.category || 'সাধারণ',
      priority: item.priority || 'মাঝারি',
      dateTime: item.dateTime || item.due_date,
      due_date: item.due_date || item.dateTime,
      room: item.room || 'general',
      createdByName: item.createdByName || '',
      url: item.url || '/tasks',
      isTriggered: false
    }));

  return sendSWMessage({
    type: 'SYNC_ALL_ALARMS',
    alarms: formattedAlarms
  });
}

/**
 * Cancel or delete an alarm in the Service Worker
 */
export async function cancelServiceWorkerAlarm(alarmId) {
  if (!alarmId) return;
  return sendSWMessage({
    type: 'CANCEL_ALARM',
    alarmId: String(alarmId)
  });
}

/**
 * Send a test alarm through the Service Worker to verify background notifications & sounds
 */
export async function triggerTestSWAlarm() {
  return sendSWMessage({
    type: 'TEST_ALARM_NOTIFICATION',
    title: '⏰ টেস্ট টাস্ক অ্যালার্ম ও সাউন্ড'
  });
}

/**
 * Register periodic background sync if supported by browser
 */
export async function registerBackgroundSync() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    if ('periodicSync' in registration) {
      const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
      if (status.state === 'granted') {
        await registration.periodicSync.register('check-task-alarms', {
          minInterval: 60 * 1000 // 1 minute interval
        });
      }
    }
  } catch (err) {
    // Periodic sync might not be granted or supported, which is normal
  }
}

/**
 * Initialize global client listener for Service Worker alarm broadcasts
 */
export function setupServiceWorkerAlarmListener(onAlarmTriggered, onCompleteTask) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return () => {};
  }

  const handleMessage = (event) => {
    const data = event.data;
    if (!data || !data.type) return;

    if (data.type === 'TASK_ALARM_FIRED') {
      // 1. Play Alarm Chime Ringtone for 10 seconds
      playTaskAlarmRingtone(10000);

      // 2. Dispatch custom DOM event
      window.dispatchEvent(
        new CustomEvent('rg_task_alarm_fired', {
          detail: data.alarm
        })
      );

      // 3. Callback if provided
      if (typeof onAlarmTriggered === 'function') {
        onAlarmTriggered(data.alarm);
      }
    } else if (data.type === 'COMPLETE_TASK_FROM_SW') {
      window.dispatchEvent(
        new CustomEvent('rg_sw_complete_task', {
          detail: { taskId: data.taskId }
        })
      );

      if (typeof onCompleteTask === 'function') {
        onCompleteTask(data.taskId);
      }
    }
  };

  navigator.serviceWorker.addEventListener('message', handleMessage);

  return () => {
    navigator.serviceWorker.removeEventListener('message', handleMessage);
  };
}
