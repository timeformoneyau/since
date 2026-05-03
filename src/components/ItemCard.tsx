import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SinceItem, ItemStatus } from '../types';
import { computeItemStatus } from '../utils/statusUtils';
import { formatDisplay, parseDate } from '../utils/dateUtils';
import { colours, statusColour } from './colours';
import { getCategoryIcon } from './categoryIcons';

interface Props {
  item: SinceItem;
  pinned: boolean;
  onPress: (item: SinceItem) => void;
  onTogglePin: (item: SinceItem) => void;
}

function daysRemainingText(status: ItemStatus): string {
  if (status.daysUntilDue === null) return 'N/A';
  const d = status.daysUntilDue;
  if (d > 1) return `${d}d remaining`;
  if (d === 1) return '1d remaining';
  if (d === 0) return 'Due today';
  return `${Math.abs(d)}d overdue`;
}

function daysRemainingColour(status: ItemStatus): string {
  if (status.daysUntilDue === null) return colours.textMuted;
  if (status.daysUntilDue <= 0) return colours.destructive;
  if (status.daysUntilDue <= 7) return colours.amber;
  return colours.textMuted;
}

export default function ItemCard({ item, pinned, onPress, onTogglePin }: Props) {
  const status = computeItemStatus(item);
  const accent = statusColour(status.label);
  const catIcon = getCategoryIcon(item.category) as any;
  const lastDone = formatDisplay(parseDate(item.lastDoneDate));
  const remaining = daysRemainingText(status);
  const remainingColour = daysRemainingColour(status);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(item)}
      activeOpacity={0.75}
    >
      <View style={[styles.accentBar, { backgroundColor: accent }]} />

      <View style={styles.left}>
        {/* Row 1: name + category + pin */}
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <View style={styles.catBadge}>
            <Ionicons name={catIcon} size={11} color={colours.textMuted} />
            <Text style={styles.catLabel} numberOfLines={1}>{item.category}</Text>
          </View>
          <TouchableOpacity
            onPress={() => onTogglePin(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel={pinned ? `Unpin ${item.name}` : `Pin ${item.name}`}
          >
            <Text style={[styles.pin, pinned && styles.pinActive]}>
              {pinned ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Row 2: last done */}
        <Text style={styles.metaText}>Last done: {lastDone}</Text>

        {/* Row 3: days remaining */}
        <Text style={[styles.metaText, { color: remainingColour }]}>{remaining}</Text>
      </View>

      {/* Right: big days-since number */}
      <View style={styles.rightCol}>
        <Text style={styles.daysNum}>{status.daysSince}</Text>
        <Text style={styles.daysSinceLabel}>DAYS{'\n'}SINCE</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    backgroundColor: colours.surface,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  accentBar: {
    width: 4,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  left: {
    flex: 1,
    paddingHorizontal: 13,
    paddingVertical: 11,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    gap: 6,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: colours.textPrimary,
    flex: 1,
    letterSpacing: -0.2,
  },
  catBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flexShrink: 1,
  },
  catLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: colours.textMuted,
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  pin: {
    fontSize: 13,
    color: colours.textMuted,
    lineHeight: 15,
  },
  pinActive: {
    color: colours.amber,
  },
  metaText: {
    fontSize: 11,
    color: colours.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  rightCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 14,
    paddingVertical: 11,
  },
  daysNum: {
    fontSize: 28,
    fontWeight: '700',
    color: colours.textPrimary,
    letterSpacing: -1,
    lineHeight: 30,
    textAlign: 'right',
  },
  daysSinceLabel: {
    fontSize: 8,
    fontWeight: '600',
    color: colours.textMuted,
    letterSpacing: 0.7,
    textAlign: 'right',
    lineHeight: 11,
  },
});
