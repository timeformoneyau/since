import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SinceItem } from '../types';
import { computeItemStatus } from '../utils/statusUtils';
import { colours, statusColour } from './colours';

interface Props {
  item: SinceItem;
  pinned: boolean;
  onPress: (item: SinceItem) => void;
  onTogglePin: (item: SinceItem) => void;
}

export default function ItemCard({ item, pinned, onPress, onTogglePin }: Props) {
  const status = computeItemStatus(item);
  const accent = statusColour(status.label);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(item)}
      activeOpacity={0.75}
    >
      <View style={[styles.accentBar, { backgroundColor: accent }]} />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.category} numberOfLines={1}>
            {item.category.toUpperCase()}
          </Text>
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
        <View style={styles.mainRow}>
          <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
          <View style={styles.rightCol}>
            <Text style={styles.daysNum}>{status.daysSince}</Text>
            <Text style={styles.daysSinceLabel}>DAYS{'\n'}SINCE</Text>
          </View>
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  category: {
    fontSize: 10,
    fontWeight: '600',
    color: colours.textMuted,
    letterSpacing: 0.9,
    flex: 1,
  },
  pin: {
    fontSize: 14,
    color: colours.textMuted,
    lineHeight: 16,
  },
  pinActive: {
    color: colours.amber,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: colours.textPrimary,
    flex: 1,
    marginRight: 12,
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  rightCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  daysNum: {
    fontSize: 30,
    fontWeight: '700',
    color: colours.textPrimary,
    letterSpacing: -1,
    lineHeight: 32,
    textAlign: 'right',
  },
  daysSinceLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: colours.textMuted,
    letterSpacing: 0.7,
    textAlign: 'right',
    lineHeight: 12,
  },
});
