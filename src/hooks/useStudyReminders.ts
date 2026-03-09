import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { toast } from 'sonner';

export function useStudyReminders() {
  const notificationsEnabled = useAppStore((s) => s.settings.notificationsEnabled);
  const reminderMinutes = useAppStore((s) => s.settings.reminderMinutesBefore);
  const cycles = useAppStore((s) => s.cycles);
  const scheduleSlots = useAppStore((s) => s.scheduleSlots);
  const disciplines = useAppStore((s) => s.disciplines);
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!notificationsEnabled) return;

    const activeCycle = cycles.find((c) => c.active);
    if (!activeCycle || scheduleSlots.length === 0) return;

    const checkReminders = () => {
      const now = new Date();
      const currentDay = now.getDay();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const todaySlots = scheduleSlots.filter((s) => s.dayOfWeek === currentDay);

      for (const slot of todaySlots) {
        const [h, m] = slot.startTime.split(':').map(Number);
        const slotMinutes = h * 60 + m;
        const diff = slotMinutes - currentMinutes;

        // Find the discipline for this block
        const block = activeCycle.blocks.find((b) => b.id === slot.cycleBlockId);
        const disc = block ? disciplines.find((d) => d.id === block.disciplineId) : null;
        const discName = disc?.name || 'Estudo';

        const notifKey = `${slot.id}-${now.toDateString()}`;

        // Notify X minutes before
        if (diff > 0 && diff <= reminderMinutes && !notifiedRef.current.has(notifKey)) {
          notifiedRef.current.add(notifKey);
          const msg = `${discName} começa em ${diff} minuto${diff !== 1 ? 's' : ''} (${slot.startTime})`;
          
          toast.info(`⏰ ${msg}`, { duration: 10000 });

          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Lembrete de Estudo', {
              body: msg,
              icon: '/favicon.ico',
              tag: notifKey,
            });
          }
        }

        // Notify at exact time
        const startKey = `start-${slot.id}-${now.toDateString()}`;
        if (diff === 0 && !notifiedRef.current.has(startKey)) {
          notifiedRef.current.add(startKey);
          const msg = `Hora de estudar ${discName}! (${slot.startTime} - ${slot.endTime})`;
          
          toast.info(`📚 ${msg}`, { duration: 15000 });

          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Hora de Estudar!', {
              body: msg,
              icon: '/favicon.ico',
              tag: startKey,
            });
          }
        }
      }
    };

    checkReminders();
    const interval = setInterval(checkReminders, 30_000); // check every 30s

    return () => clearInterval(interval);
  }, [notificationsEnabled, reminderMinutes, cycles, scheduleSlots, disciplines]);
}
