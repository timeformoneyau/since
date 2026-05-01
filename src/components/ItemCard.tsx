import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SinceItem } from '../types';
import { computeItemStatus, secondaryLine } from '../utils/statusUtils';
import { humaniseDaysSince } from '../utils/dateUtils';
import { colours, statusColour } from './colours';

interface Props {
  item: SinceItem;
  pinned: boolean;
  onMarkDone: (item: SinceItem) => void;
  onEdit: (item: SinceItem) => void;
  onPress: (item: SinceItem) => void;
  onTogglePin: (item: SinceItem) => void;
}

export default function ItemCard({ item, pinned, onMarkDone, onEdit, onPress, onTogglePin }: Props) {
  const status = computeItemStatus(item);
  const { label, daysSince } = status;
  const secondary = secondaryLine(status);
  const accent = statusColour(label);

  return (
    <View style={styles.container}>
      <View style={[styles.accentBar, { backgroundColor: accent }]} />

      <TouchableOpacity
        style={styles.content}
        onPress={() => onPress(item)}
        activeOpacity={0.7}>

        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <TouchableOpacity
            onPress={() => onTogglePin(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel={pinned ? `Unpin ${item.name}` : `Pin ${item.name}`}
            accessibilityRole="button"
          >
            <Text style={[styles.pinIcon, pinned && styles.pinIconActive]}>
              {pinned ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onEdit(item)}
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
            accessibilityLabel={`Edit ${item.name}`}
            accessibilityRole="button"
          >
            <Text style={styles.editLink}>Edit</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sinceText}>
          {daysSince === 0 ? 'Done today' : `Last done ${humaniseDaysSince(daysSince)}`}
        </Text>

        <View style={styles.bottomRow}>
          <View style={styles.statusInfo}>
            {label !== null ? (
              <>
                <View style={[styles.statusDot, { backgroundColor: accent }]} />
                <Text style={[styles.statusLabel, { color: accent }]}>{label}</Text>
                {secondary !== '' && (
                  <Text style={styles.secondaryText}> · {secondary}</Text>
                )}
              </>
            ) : (
              <Text style={styles.secondaryText}>No repeat set</Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => onMarkDone(item)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityLabel={`Mark ${item.name} as done`}
            accessibilityRole="button"
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  accentBar: {
    width: 4,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  content: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 5,
    gap: 10,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colours.textPrimary,
    flex: 1,
  },
  pinIcon: {
    fontSize: 16,
    color: colours.textMuted,
    lineHeight: 20,
  },
  pinIconActive: {
    color: '#C8842A',
  },
  editLink: {
    fontSize: 13,
    fontWeight: '500',
    color: colours.textMuted,
    letterSpacing: 0.1,
  },
  sinceText: {
    fontSize: 13,
    color: colours.textSecondary,
    marginBottom: 10,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  secondaryText: {
    fontSize: 12,
    color: colours.textMuted,
  },
  doneBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F0F0EE',
    borderRadius: 6,
    marginLeft: 10,
  },
  doneBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colours.textSecondary,
    letterSpacing: 0.2,
  },
});
