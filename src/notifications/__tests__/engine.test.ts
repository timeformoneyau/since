import * as Notifications from 'expo-notifications';
import { SinceItem } from '../../types';
import { scheduleItemNotifications } from '../engine';
import { todayString } from '../../utils/dateUtils';

jest.mock('expo-notifications', () => ({
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  scheduleNotificationAsync: jest.fn(async () => 'id'),
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

function makeItem(repeatValue: number | null, repeatUnit: SinceItem['repeatUnit']): SinceItem {
  return {
    id: 'item1',
    name: 'Haircut',
    category: 'Other',
    lastDoneDate: todayString(),
    history: [{ id: 'e0', date: todayString() }],
    repeatValue,
    repeatUnit,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

beforeEach(() => jest.clearAllMocks());

it('schedules no reminders for a tracked-only item', async () => {
  await scheduleItemNotifications(makeItem(null, null));
  expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
});

it('still schedules reminders for a repeating item', async () => {
  await scheduleItemNotifications(makeItem(1, 'months'));
  expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
});
