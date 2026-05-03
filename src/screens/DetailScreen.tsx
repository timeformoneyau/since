import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, CompletionEvent } from '../types';
import { DerivedItem } from '../domain/items/types';
import { getDerivedItemById, markItemDone, deleteItem } from '../domain/items/service';
import { secondaryLine } from '../utils/statusUtils';
import { humaniseDaysSince, parseDate, formatDisplay, getDaysSince, intervalToDays } from '../utils/dateUtils';
import { colours, statusColour, statusBgColour } from '../components/colours';

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

function formatGapShort(days: number): string {
  if (days < 14) return `${days}d`;
  if (days < 60) return `${Math.round(days / 7)}w`;
  if (days < 730) return `${Math.round(days / 30)}mo`;
  return `${Math.round(days / 365)}y`;
}

function formatGapLong(days: number): string {
  if (days === 1) return '1 day since previous';
  if (days < 14) return `${days} days since previous`;
  if (days < 60) return `${Math.round(days / 7)} weeks since previous`;
  if (days < 730) return `${Math.round(days / 30)} months since previous`;
  return `${Math.round(days / 365)} years since previous`;
}

function gapBetween(olderDate: string, newerDate: string): number {
  return getDaysSince(olderDate) - getDaysSince(newerDate);
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

  async function handleDelete() {
    Alert.alert(
      'Delete item',
      `Remove "${item?.name}" from Since?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteItem(itemId);
            navigation.goBack();
          },
        },
      ],
    );
  }

  if (!item) return null;

  const { status } = item;
  const { label, daysSince } = status;
  const accent = statusColour(label);
  const badgeBg = statusBgColour(label);
  const secondary = secondaryLine(status);
  const alreadyDoneToday = daysSince === 0;

  const history = [...item.history].sort((a, b) => b.date.localeCompare(a.date));
  const avg = averageGapDays(history);
  const lastGap = history.length >= 2
    ? gapBetween(history[1].date, history[0].date)
    : null;
  const intervalDays = item.repeatValue && item.repeatUnit
    ? intervalToDays(item.repeatValue, item.repeatUnit)
    : null;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colours.background} />

      {/* Nav bar — back only, no Edit button here */}
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.navBack}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>{item.name}</Text>
        <View style={styles.navRight} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Status badge */}
        {label !== null && (
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: badgeBg }]}>
              <Text style={[styles.badgeText, { color: accent }]}>
                {label.toUpperCase()}
              </Text>
            </View>
          </View>
        )}

        {/* Hero metric */}
        <View style={styles.heroBlock}>
          <Text style={styles.heroNumber}>{daysSince}</Text>
          <Text style={styles.heroLabel}>days since</Text>
        </View>

        {secondary !== '' && secondary !== 'No repeat set' && (
          <Text style={styles.heroSub}>{secondary}</Text>
        )}

        {/* Mark done */}
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

        {/* Stats */}
        {(avg !== null || lastGap !== null) && (
          <>
            <Text style={styles.sectionTitle}>STATS</Text>
            <View style={styles.statsRow}>
              {avg !== null && (
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>AVERAGE CADENCE</Text>
                  <Text style={styles.statValue}>{formatGapShort(avg)}</Text>
                </View>
              )}
              {lastGap !== null && (
                <View style={[styles.statCard, avg !== null && { marginLeft: 10 }]}>
                  <Text style={styles.statLabel}>LAST GAP</Text>
                  <Text style={styles.statValue}>{formatGapShort(lastGap)}</Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* Notes */}
        {item.notes && item.notes.trim().length > 0 && (
          <>
            <Text style={styles.sectionTitle}>NOTES</Text>
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{item.notes}</Text>
            </View>
          </>
        )}

        {/* History */}
        <Text style={styles.sectionTitle}>HISTORY</Text>
        {history.length === 0 ? (
          <Text style={styles.emptyHistory}>
            No history yet. Tap "Mark as done today" to start tracking.
          </Text>
        ) : (
          <View style={styles.historyList}>
            {history.map((event, index) => {
              const daysSinceEvent = getDaysSince(event.date);
              const isToday = daysSinceEvent === 0;
              const dateText = formatDisplay(parseDate(event.date));
              const relativeText = isToday ? 'Today' : humaniseDaysSince(daysSinceEvent);
              const nextEvent = history[index + 1];
              const gap = nextEvent ? gapBetween(nextEvent.date, event.date) : null;
              let badge: 'on_track' | 'delayed' | null = null;
              if (gap !== null && intervalDays !== null) {
                badge = gap <= intervalDays * 1.1 ? 'on_track' : 'delayed';
              }
              return (
                <View key={event.id} style={styles.historyCard}>
                  <View style={styles.historyCardTop}>
                    <View style={styles.historyDot} />
                    <View style={styles.historyCardContent}>
                      <Text style={[styles.historyDate, index === 0 && styles.historyDateRecent]}>
                        {dateText}
                      </Text>
                      <Text style={styles.historyRelative}>{relativeText}</Text>
                    </View>
                    {badge === 'on_track' && (
                      <View style={styles.onTrackBadge}>
                        <Text style={styles.onTrackText}>ON TRACK</Text>
                      </View>
                    )}
                    {badge === 'delayed' && (
                      <View style={styles.delayedBadge}>
                        <Text style={styles.delayedText}>DELAYED</Text>
                      </View>
                    )}
                  </View>
                  {gap !== null && (
                    <Text style={styles.gapText}>{formatGapLong(gap)}</Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Edit + Delete actions — in the body, not the nav bar */}
        <View style={styles.actionsBlock}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate('Edit', { itemId })}
          >
            <Text style={styles.editBtnText}>Edit item</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Text style={styles.deleteBtnText}>Delete item</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },

  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  navBack: { fontSize: 15, color: colours.textSecondary, minWidth: 60 },
  navTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colours.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  navRight: { minWidth: 60 },

  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 48 },

  badgeRow: { alignItems: 'center', marginBottom: 16 },
  badge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },

  heroBlock: { alignItems: 'center', marginBottom: 6 },
  heroNumber: {
    fontSize: 72,
    fontWeight: '700',
    color: colours.textPrimary,
    letterSpacing: -3,
    lineHeight: 80,
  },
  heroLabel: { fontSize: 16, color: colours.textSecondary, fontWeight: '400', marginTop: 2 },
  heroSub: { fontSize: 13, color: colours.textMuted, textAlign: 'center', marginBottom: 4 },

  doneBtn: {
    backgroundColor: colours.textPrimary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  doneBtnDisabled: { backgroundColor: colours.border },
  doneBtnText: { color: '#fff', fontSize: 15, fontWeight: '600', letterSpacing: 0.2 },
  doneBtnTextDisabled: { color: colours.textMuted },

  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colours.textMuted,
    letterSpacing: 0.9,
    marginBottom: 12,
    marginTop: 4,
  },

  statsRow: { flexDirection: 'row', marginBottom: 28 },
  statCard: {
    flex: 1,
    backgroundColor: colours.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colours.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  statLabel: { fontSize: 9, fontWeight: '600', color: colours.textMuted, letterSpacing: 0.8, marginBottom: 6 },
  statValue: { fontSize: 28, fontWeight: '700', color: colours.textPrimary, letterSpacing: -1 },

  notesCard: {
    backgroundColor: colours.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colours.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 28,
  },
  notesText: { fontSize: 14, color: colours.textPrimary, lineHeight: 20 },

  emptyHistory: { fontSize: 14, color: colours.textMuted, lineHeight: 20 },
  historyList: { gap: 8, marginBottom: 28 },
  historyCard: {
    backgroundColor: colours.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colours.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  historyCardTop: { flexDirection: 'row', alignItems: 'center' },
  historyDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colours.amber,
    marginRight: 10, flexShrink: 0,
  },
  historyCardContent: { flex: 1 },
  historyDate: { fontSize: 15, color: colours.textSecondary, fontWeight: '500' },
  historyDateRecent: { color: colours.textPrimary, fontWeight: '600' },
  historyRelative: { fontSize: 12, color: colours.textMuted, marginTop: 1 },
  onTrackBadge: { backgroundColor: '#FFF3E0', borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3 },
  onTrackText: { fontSize: 9, fontWeight: '700', color: colours.amber, letterSpacing: 0.5 },
  delayedBadge: { borderWidth: 1, borderColor: colours.destructive, borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3 },
  delayedText: { fontSize: 9, fontWeight: '700', color: colours.destructive, letterSpacing: 0.5 },
  gapText: { fontSize: 11, color: colours.textMuted, marginTop: 6, marginLeft: 18, fontStyle: 'italic' },

  actionsBlock: {
    marginTop: 12,
    gap: 4,
  },
  editBtn: {
    borderWidth: 1,
    borderColor: colours.border,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: colours.surface,
    marginBottom: 4,
  },
  editBtnText: { fontSize: 15, fontWeight: '600', color: colours.textPrimary },
  deleteBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteBtnText: { fontSize: 15, color: colours.destructive, fontWeight: '500' },
});
