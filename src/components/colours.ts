import { StatusLabel } from '../types';

export const colours = {
  background: '#FAFAF8',
  surface: '#FFFFFF',
  border: '#EBEBEA',
  textPrimary: '#111110',
  textSecondary: '#797776',
  textMuted: '#9E9E9A',

  // Status colours
  allGood: '#9E9E9A',
  comingUp: '#C8842A',
  aboutNow: '#C8842A',
  itsBeenAWhile: '#B85C3A',
  gettingOverdue: '#C0392B',
  longOverdue: '#922B21',

  // UI
  primary: '#111110',
  destructive: '#C0392B',
  separator: '#EBEBEA',
  amber: '#C8842A',
} as const;

export function statusColour(label: StatusLabel | null): string {
  switch (label) {
    case 'All good':          return colours.allGood;
    case 'Coming up':         return colours.comingUp;
    case 'About now':         return colours.aboutNow;
    case "It's been a while": return colours.itsBeenAWhile;
    case 'Getting overdue':   return colours.gettingOverdue;
    case 'Long overdue':      return colours.longOverdue;
    case null:                return colours.textMuted;
    default:                  return colours.textMuted;
  }
}

export function statusBgColour(label: StatusLabel | null): string {
  switch (label) {
    case 'All good':          return '#F0F0EE';
    case 'Coming up':         return '#FFF3E0';
    case 'About now':         return '#FFF3E0';
    case "It's been a while": return '#FBE9E3';
    case 'Getting overdue':   return '#FDECEA';
    case 'Long overdue':      return '#FDECEA';
    case null:                return '#F0F0EE';
    default:                  return '#F0F0EE';
  }
}
