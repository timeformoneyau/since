import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, CompletionEvent } from '../types';
import { DerivedItem } from '../domain/items/types';
import { getDerivedItemById, markItemDone } from '../domain/items/service';
import { secondaryLine } from '../utils/statusUtils';
import { humaniseDaysSince, parseDate, formatDisplay, getDaysSince } from '../utils/dateUtils';
import { colours, statusColour } from '../components/colours';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Detail'>;
type Route = RouteProp<RootStackParamList, 'Detail'>;

function averageGapDays(history: CompletionEvent[]): number | null {
  if (history.length < 2) return null;
  const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));
  let total = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    total += getDaysSince(sorted[i + 1].date) - getDaysSince(sorted[i].date);
  }
  return Math.round(total / (sorted.length - 1));
}

function formatAverage(days: number): string {
  if (days < 14) return `avg. ${days}d`;
  if (days < 60) return `avg. ${Math.round(days / 7)}w`;
  if (days < 730) return `avg. ${Math.round(days / 30)}mo`;
  return `avg. ${Math.round(days / 365)}y`;
}

function gapBetween(olderDate: string, newerDate: string): number {
  return getDaysSince(olderDate) - getDaysSince(newerDate);
}

function formatGap(days: number): string {
  if (days === 1) return '1 day later';
  if (days < 14) return `${days} days later`;
  if (days < 60) return `${Math.round(days / 7)} weeks later`;
  if (days < 730) return `${Math.round(days / 30)} months later`;
  return `${Math.round(days / 365)} years later`;
}

export default function DetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { itemId } = route.params;

  const [item, setItem] = useState<DerivedItem | null>(null);

  const load = useCallback(async () => {
    const derived = await getDerivedItemById(itemId);
    if (!derived) { navigation.goBack(); return; }
    setItem(derived);
  }, [itemId]);

  useFocusEffect(
    useCallback(() => { load(); }, [load]),
  );

  async function handleMarkDone() {
    await markItemDone(itemId);
    await load();
  }

  if (!item) return null;

  const { status } = item;
  const { label, daysSince } = status;
  const accent = statusColour(label);
  const secondary = secondaryLine(status);
  const alreadyDoneToday = daysSince === 0;

  // history sorted newest-first (service guarantees this, but ensure it)
  const history = [...item.history].sort((a, b) => b.date.localeCompare(a.date));
  const avg = averageGapDays(history);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colours.background} />

      {/* Nav bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.navBack}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate('Edit', { itemId })}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.navEdit}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Item header */}
        <View style={styles.headerBlock}>
          <View style={[styles.accentPill, { backgroundColor: accent }]} />
          <View style={styles.headerText}>
            <Text style={styles.itemName}>{item.name}</Text>
            {item.category ? (
              <Text style={styles.categoryLabel}>{item.category}</Text>
            ) : null}
          </View>
        </View>

        {/* Status row */}
        <View style={styles.statusRow}>
          {label !== null ? (
            <>
              <View style={[styles.statusDot, { backgroundColor: accent }]} />
              <Text style={[styles.statusLabel, { color: accent }]}>{label}</Text>
              {secondary !== '' && (
                <Text style={styles.statusSecondary}> · {secondary}</Text>
              )}
            </>
          ) : (
            <Text style={styles.statusSecondary}>No repeat interval set</Text>
          )}
        </View>

        {/* Since text */}
        <Text style={styles.sinceText}>
          {alreadyDoneToday
            ? 'You did this today'
            : `Last done ${humaniseDaysSince(daysSince)}`}
        </Text>

        {/* Mark done CTA */}
        <TouchableOpacity
          style={[styles.doneBtn, alreadyDoneToday && styles.doneBtnDisabled]}
          onPress={handleMarkDone}
          disabled={alreadyDoneToday}
          activeOpacity={0.8}
        >
          <Text style={[styles.doneBtnText, alreadyDoneToday && styles.doneBtnTextDisabled]}>
            {alreadyDoneToday ? 'Done today ✓' : 'Mark as done today'}
          </Text>
        </TouchableOpacity>

        {/* History section */}
        <View style={styles.historyHeader}>
          <Text style={styles.historyTitle}>History</Text>
          {avg !== null && (
            <Text style={styles.historyAvg}>{formatAverage(avg)}</Text>
          )}
        </View>

        {history.length === 0 ? (
          <Text style={styles.emptyHistory}>
            No history yet. Tap "Mark as done today" to start tracking.
          </Text>
        ) : (
          <View style={styles.timeline}>
            {history.map((event, index) => {
              const daysSinceEvent = getDaysSince(event.date);
              const isToday = daysSinceEvent === 0;
              const relativeText = isToday ? 'Today' : humaniseDaysSince(daysSinceEvent);
              const dateText = formatDisplay(parseDate(event.date));

              // Gap between this entry and the one before it (chronologically earlier = higher index)
              const nextEvent = history[index + 1];
              const gap = nextEvent ? gapBetween(nextEvent.date, event.date) : null;

              return (
                <View key={event.id}>
                  {/* Event row */}
                  <View style={styles.eventRow}>
                    <View style={styles.eventDotCol}>
                      <View style={[styles.eventDot, index === 0 && { backgroundColor: accent }]} />
                    </View>
                    <View style={styles.eventText}>
                      <Text style={[styles.eventDate, index === 0 && { color: colours.textPrimary, fontWeight: '600' }]}>
                        {dateText}
                      </Text>
                      <Text style={styles.eventRelative}>{relativeText}</Text>
                    </View>
                  </View>

                  {/* Gap connector */}
                  {gap !== null && (
                    <View style={styles.gapRow}>
                      <View style={styles.gapLineCol}>
                        <View style={styles.gapLine} />
                      </View>
                      <Text style={styles.gapText}>{formatGap(gap)}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const DOT_SIZE = 10;
const DOT_COL_WIDTH = 28;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colours.background,
  },

  // Nav bar
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  navBack: {
    fontSize: 15,
    color: colours.textSecondary,
  },
  navEdit: {
    fontSize: 15,
    color: colours.textSecondary,
    fontWeight: '500',
  },

  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 48,
  },

  // Header block
  headerBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  accentPill: {
    width: 4,
    height: 36,
    borderRadius: 2,
    marginRight: 14,
    marginTop: 4,
  },
  headerText: {
    flex: 1,
  },
  itemName: {
    fontSize: 30,
    fontWeight: '700',
    color: colours.textPrimary,
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  categoryLabel: {
    fontSize: 13,
    color: colours.textMuted,
    marginTop: 2,
  },

  // Status
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  statusSecondary: {
    fontSize: 13,
    color: colours.textMuted,
  },
  sinceText: {
    fontSize: 14,
    color: colours.textSecondary,
    marginBottom: 28,
  },

  // Done button
  doneBtn: {
    backgroundColor: colours.textPrimary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 36,
  },
  doneBtnDisabled: {
    backgroundColor: colours.border,
  },
  doneBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  doneBtnTextDisabled: {
    color: colours.textMuted,
  },

  // History header
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  historyTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colours.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  historyAvg: {
    fontSize: 12,
    color: colours.textMuted,
    fontWeight: '500',
  },
  emptyHistory: {
    fontSize: 14,
    color: colours.textMuted,
    lineHeight: 20,
  },

  // Timeline
  timeline: {},
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventDotCol: {
    width: DOT_COL_WIDTH,
    alignItems: 'center',
  },
  eventDot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: colours.border,
  },
  eventText: {
    flex: 1,
    paddingVertical: 2,
  },
  eventDate: {
    fontSize: 15,
    color: colours.textSecondary,
  },
  eventRelative: {
    fontSize: 12,
    color: colours.textMuted,
    marginTop: 1,
  },

  // Gap connector
  gapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 32,
  },
  gapLineCol: {
    width: DOT_COL_WIDTH,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  gapLine: {
    flex: 1,
    width: 1,
    backgroundColor: colours.border,
  },
  gapText: {
    fontSize: 11,
    color: colours.textMuted,
    fontStyle: 'italic',
    letterSpacing: 0.1,
  },
});
