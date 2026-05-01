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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SinceItem, RootStackParamList } from '../types';
import { DerivedItem } from '../domain/items/types';
import { getDerivedItems, markItemDone } from '../domain/items/service';
import { getUser } from '../domain/auth/service';
import { loadPinnedIds, togglePin } from '../domain/items/pins';
import { statusSortOrder } from '../utils/statusUtils';
import ItemCard from '../components/ItemCard';
import { colours } from '../components/colours';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Main'>;
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

// Pinned items: soonest due first, then newest created for items without a repeat
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
    if (rest.length > 0) sections.push({ title: '', data: rest });
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
  const [userInitial, setUserInitial] = useState('');
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [sortMode, setSortMode] = useState<SortMode>('status');
  const [groupMode, setGroupMode] = useState<GroupMode>('all');

  useEffect(() => {
    getUser().then((u) => {
      if (u?.email) setUserInitial(u.email[0].toUpperCase());
    });
    loadPinnedIds().then(setPinnedIds);
  }, []);

  const refresh = useCallback(async () => {
    setItems(await getDerivedItems());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  async function handleMarkDone(item: SinceItem) {
    await markItemDone(item.id);
    refresh();
  }

  function handleEdit(item: SinceItem) {
    navigation.navigate('Edit', { itemId: item.id });
  }

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
    { key: 'status', label: 'Status' },
    { key: 'newest', label: 'Newest' },
    { key: 'due', label: 'Due date' },
  ];

  const GROUP_OPTIONS: { key: GroupMode; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'grouped', label: 'Grouped' },
    ...categories.map((c) => ({ key: c, label: c })),
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colours.background} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Since</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.avatarBtn}
            onPress={() => navigation.navigate('Account')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.avatarBtnText}>{userInitial || '?'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('Add')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.addBtnText}>＋</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sort controls */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.controlRow}
        contentContainerStyle={styles.controlRowContent}
      >
        {SORT_OPTIONS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.pill, sortMode === key && styles.pillActive]}
            onPress={() => setSortMode(key)}
          >
            <Text style={[styles.pillText, sortMode === key && styles.pillTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Group / filter controls */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.controlRow}
        contentContainerStyle={styles.controlRowContent}
      >
        {GROUP_OPTIONS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.pill, groupMode === key && styles.pillActive]}
            onPress={() => setGroupMode(key)}
          >
            <Text style={[styles.pillText, groupMode === key && styles.pillTextActive]}>
              {label}
            </Text>
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
            onMarkDone={handleMarkDone}
            onEdit={handleEdit}
            onPress={handlePress}
            onTogglePin={handleTogglePin}
          />
        )}
        renderSectionHeader={({ section }) =>
          section.title ? (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{section.title}</Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colours.background,
  },

  // Empty state
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
  primaryCTAText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  quickStartLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colours.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  quickStartRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: colours.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: colours.surface,
  },
  chipText: {
    fontSize: 13,
    color: colours.textSecondary,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colours.textPrimary,
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colours.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colours.textSecondary,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colours.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: {
    color: '#fff',
    fontSize: 20,
    lineHeight: 22,
    marginTop: -1,
  },

  // Control bars
  controlRow: {
    flexGrow: 0,
    marginBottom: 4,
  },
  controlRowContent: {
    paddingHorizontal: 16,
    gap: 6,
    flexDirection: 'row',
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.surface,
  },
  pillActive: {
    backgroundColor: colours.textPrimary,
    borderColor: colours.textPrimary,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '500',
    color: colours.textSecondary,
  },
  pillTextActive: {
    color: '#fff',
  },

  // Section headers
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
  },
  sectionHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: colours.textMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },

  list: {
    paddingTop: 4,
    paddingBottom: 32,
  },
});
