import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  SectionList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SinceItem, RootStackParamList, TabParamList } from '../types';
import { DerivedItem } from '../domain/items/types';
import { getDerivedItems, getLocalDerivedItems } from '../domain/items/service';
import { getUser } from '../domain/auth/service';
import { loadPinnedIds, togglePin } from '../domain/items/pins';
import { statusSortOrder } from '../utils/statusUtils';
import ItemCard from '../components/ItemCard';
import { colours } from '../components/colours';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Since'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type SortMode = 'status' | 'newest' | 'due';
type GroupMode = 'all' | 'grouped' | string;

const QUICK_START = [
  { name: 'Dentist', category: 'Health' },
  { name: 'Tyre rotation', category: 'Auto' },
  { name: 'Air filter', category: 'Household' },
  { name: 'Smoke alarm', category: 'Household' },
];

function applySort(items: DerivedItem[], mode: SortMode): DerivedItem[] {
  switch (mode) {
    case 'newest':
      return [...items].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    case 'due':
      return [...items].sort((a, b) => {
        const ad = a.status.daysUntilDue;
        const bd = b.status.daysUntilDue;
        if (ad !== null && bd !== null) return ad - bd;
        if (ad !== null) return -1;
        if (bd !== null) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    default:
      return [...items].sort((a, b) => {
        const od = statusSortOrder(a.status.label) - statusSortOrder(b.status.label);
        if (od !== 0) return od;
        if (a.status.daysUntilDue !== null && b.status.daysUntilDue !== null) {
          return a.status.daysUntilDue - b.status.daysUntilDue;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }
}

function sortPinned(items: DerivedItem[]): DerivedItem[] {
  return [...items].sort((a, b) => {
    const ad = a.status.daysUntilDue;
    const bd = b.status.daysUntilDue;
    if (ad !== null && bd !== null) return ad - bd;
    if (ad !== null) return -1;
    if (bd !== null) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

type ListSection = { title: string; data: DerivedItem[] };

function buildSections(
  items: DerivedItem[],
  pinnedIds: Set<string>,
  sortMode: SortMode,
  groupMode: GroupMode,
): ListSection[] {
  const pinnedItems = sortPinned(items.filter((i) => pinnedIds.has(i.id)));
  const rest = applySort(items.filter((i) => !pinnedIds.has(i.id)), sortMode);
  const sections: ListSection[] = [];
  if (pinnedItems.length > 0) {
    sections.push({ title: 'Pinned', data: pinnedItems });
  }
  if (groupMode === 'all') {
    if (rest.length > 0) sections.push({ title: 'Since List', data: rest });
  } else if (groupMode === 'grouped') {
    const cats = [...new Set(rest.map((i) => i.category))].sort();
    for (const cat of cats) {
      const catItems = rest.filter((i) => i.category === cat);
      if (catItems.length > 0) sections.push({ title: cat, data: catItems });
    }
  } else {
    const catItems = rest.filter((i) => i.category === groupMode);
    if (catItems.length > 0) sections.push({ title: groupMode, data: catItems });
  }
  return sections;
}

export default function MainListScreen() {
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<DerivedItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [userInitial, setUserInitial] = useState('');
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [sortMode, setSortMode] = useState<SortMode>('status');
  const [groupMode, setGroupMode] = useState<GroupMode>('all');

  useEffect(() => {
    // Load from local cache immediately to avoid blank screen
    getLocalDerivedItems().then((cached) => {
      setItems(cached);
      setLoaded(true);
    });
    getUser().then((u) => {
      if (u?.email) setUserInitial(u.email[0].toUpperCase());
    });
    loadPinnedIds().then(setPinnedIds);
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Sync from cloud in the background; updates items when complete
      getDerivedItems().then(setItems);
    }, []),
  );

  function handlePress(item: SinceItem) {
    navigation.navigate('Detail', { itemId: item.id });
  }

  async function handleTogglePin(item: SinceItem) {
    const next = await togglePin(item.id, pinnedIds);
    setPinnedIds(new Set(next));
  }

  const categories = useMemo(
    () => [...new Set(items.map((i) => i.category))].sort(),
    [items],
  );

  const sections = useMemo(
    () => buildSections(items, pinnedIds, sortMode, groupMode),
    [items, pinnedIds, sortMode, groupMode],
  );

  // Show background while initial cache loads (prevents flash of empty state)
  if (!loaded) {
    return <SafeAreaView style={styles.safe} />;
  }

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={colours.background} />
        <View style={styles.emptyContainer}>
          <Text style={styles.appTitle}>Since</Text>
          <Text style={styles.appTagline}>Know how long it's been</Text>
          <Text style={styles.appSupport}>
            Track the things you don't do often enough and we'll keep count for you.
          </Text>
          <TouchableOpacity
            style={styles.primaryCTA}
            onPress={() => navigation.navigate('Add')}
          >
            <Text style={styles.primaryCTAText}>Add something</Text>
          </TouchableOpacity>
          <Text style={styles.quickStartLabel}>Quick start</Text>
          <View style={styles.quickStartRow}>
            {QUICK_START.map((q) => (
              <TouchableOpacity
                key={q.name}
                style={styles.chip}
                onPress={() => navigation.navigate('Add')}
              >
                <Text style={styles.chipText}>{q.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const SORT_OPTIONS: { key: SortMode; label: string }[] = [
    { key: 'status', label: 'Status urgency' },
    { key: 'newest', label: 'Newest' },
    { key: 'due', label: 'Due date' },
  ];

  const CATEGORY_TABS: { key: GroupMode; label: string }[] = [
    { key: 'all', label: 'ALL' },
    ...categories.map((c) => ({ key: c, label: c.toUpperCase() })),
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colours.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Since List</Text>
        <TouchableOpacity
          style={styles.avatarBtn}
          onPress={() => navigation.navigate('Account')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.avatarBtnText}>{userInitial || '?'}</Text>
        </TouchableOpacity>
      </View>

      {/* Sort pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.sortRow}
        contentContainerStyle={styles.sortRowContent}
      >
        {SORT_OPTIONS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.sortPill, sortMode === key && styles.sortPillActive]}
            onPress={() => setSortMode(key)}
          >
            <Text style={[styles.sortPillText, sortMode === key && styles.sortPillTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.catRow}
        contentContainerStyle={styles.catRowContent}
      >
        {CATEGORY_TABS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={styles.catTab}
            onPress={() => setGroupMode(key)}
          >
            <Text style={[styles.catTabText, groupMode === key && styles.catTabTextActive]}>
              {label}
            </Text>
            {groupMode === key && <View style={styles.catTabUnderline} />}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ItemCard
            item={item}
            pinned={pinnedIds.has(item.id)}
            onPress={handlePress}
            onTogglePin={handleTogglePin}
          />
        )}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            {section.title === 'Pinned' ? (
              <Text style={styles.sectionHeaderText}>↑  PINNED</Text>
            ) : (
              <Text style={styles.sectionHeaderText}>{section.title.toUpperCase()}</Text>
            )}
          </View>
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Add')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colours.background,
  },
  emptyContainer: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  appTitle: {
    fontSize: 42,
    fontWeight: '700',
    color: colours.textPrimary,
    letterSpacing: -1,
    marginBottom: 6,
  },
  appTagline: {
    fontSize: 20,
    fontWeight: '400',
    color: colours.textPrimary,
    marginBottom: 16,
  },
  appSupport: {
    fontSize: 15,
    color: colours.textSecondary,
    lineHeight: 22,
    marginBottom: 40,
  },
  primaryCTA: {
    backgroundColor: colours.textPrimary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 40,
  },
  primaryCTAText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  quickStartLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colours.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  quickStartRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colours.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: colours.surface,
  },
  chipText: { fontSize: 13, color: colours.textSecondary },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colours.textPrimary,
    letterSpacing: -0.5,
  },
  avatarBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colours.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },

  sortRow: { flexGrow: 0, marginBottom: 2 },
  sortRowContent: { paddingHorizontal: 16, gap: 6, flexDirection: 'row' },
  sortPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.surface,
  },
  sortPillActive: { backgroundColor: colours.textPrimary, borderColor: colours.textPrimary },
  sortPillText: { fontSize: 13, fontWeight: '500', color: colours.textSecondary },
  sortPillTextActive: { color: '#fff', fontWeight: '600' },

  catRow: { flexGrow: 0, marginBottom: 8, marginTop: 6 },
  catRowContent: { paddingHorizontal: 16, flexDirection: 'row', gap: 20 },
  catTab: { paddingVertical: 4, alignItems: 'center' },
  catTabText: { fontSize: 11, fontWeight: '600', color: colours.textMuted, letterSpacing: 0.7 },
  catTabTextActive: { color: colours.textPrimary },
  catTabUnderline: {
    height: 2,
    backgroundColor: colours.textPrimary,
    borderRadius: 1,
    marginTop: 3,
    alignSelf: 'stretch',
  },

  sectionHeader: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 },
  sectionHeaderText: {
    fontSize: 10,
    fontWeight: '700',
    color: colours.textMuted,
    letterSpacing: 0.9,
  },

  list: { paddingTop: 2, paddingBottom: 100 },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colours.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 30, lineHeight: 34, fontWeight: '300', marginTop: -2 },
});
