import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SinceItem, RootStackParamList, DEFAULT_CATEGORIES } from '../types';
import { DerivedItem } from '../domain/items/types';
import { getDerivedItems, markItemDone } from '../domain/items/service';
import { getUser } from '../domain/auth/service';
import { sortItems, computeItemStatus, statusSortOrder } from '../utils/statusUtils';
import ItemCard from '../components/ItemCard';
import { colours } from '../components/colours';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Main'>;
type Section = { title: string; data: DerivedItem[] };

function buildSections(items: DerivedItem[]): Section[] {
  const map = new Map<string, DerivedItem[]>();
  for (const item of items) {
    const cat = item.category || 'Other';
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(item);
  }

  const sections: Array<Section & { urgency: number; catOrder: number }> = [];
  for (const [title, data] of map.entries()) {
    const sorted = sortItems(data) as DerivedItem[];
    const urgency = statusSortOrder(computeItemStatus(sorted[0]).label);
    const catOrder = (DEFAULT_CATEGORIES as readonly string[]).indexOf(title);
    sections.push({
      title,
      data: sorted,
      urgency,
      catOrder: catOrder === -1 ? DEFAULT_CATEGORIES.length : catOrder,
    });
  }

  // Most urgent section first; DEFAULT_CATEGORIES order as tiebreaker
  sections.sort((a, b) => a.urgency - b.urgency || a.catOrder - b.catOrder);

  return sections.map(({ title, data }) => ({ title, data }));
}

export default function MainListScreen() {
  const navigation = useNavigation<Nav>();
  const [sections, setSections] = useState<Section[]>([]);
  const [userInitial, setUserInitial] = useState('');

  useEffect(() => {
    getUser().then((u) => {
      if (u?.email) setUserInitial(u.email[0].toUpperCase());
    });
  }, []);

  const refresh = useCallback(async () => {
    const items = await getDerivedItems();
    setSections(buildSections(items));
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

  const isEmpty = sections.length === 0;

  if (isEmpty) {
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

          <Text style={styles.exampleLabel}>Here's the idea</Text>
          <View style={styles.exampleCards}>
            <View style={styles.exampleCard}>
              <View style={[styles.exampleAccent, { backgroundColor: colours.comingUp }]} />
              <View style={styles.exampleBody}>
                <Text style={styles.exampleName}>Milk</Text>
                <Text style={styles.exampleMeta}>Coming up · expires tomorrow</Text>
              </View>
            </View>
            <View style={styles.exampleCard}>
              <View style={[styles.exampleAccent, { backgroundColor: colours.gettingOverdue }]} />
              <View style={styles.exampleBody}>
                <Text style={styles.exampleName}>Car service</Text>
                <Text style={styles.exampleMeta}>Getting overdue · 6 weeks ago</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.scanCTA}
            onPress={() => navigation.navigate('ScanFood')}
          >
            <Text style={styles.scanCTAText}>📷  Scan food</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colours.background} />

      {/* Header */}
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
            style={styles.cameraBtn}
            onPress={() => navigation.navigate('ScanFood')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.cameraBtnText}>📷</Text>
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

      <SectionList<DerivedItem>
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ItemCard
            item={item}
            onMarkDone={handleMarkDone}
            onEdit={handleEdit}
            onPress={handlePress}
          />
        )}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{section.title}</Text>
          </View>
        )}
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
    marginBottom: 32,
  },
  primaryCTAText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  exampleLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colours.textMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  exampleCards: {
    gap: 8,
    marginBottom: 24,
  },
  exampleCard: {
    flexDirection: 'row',
    backgroundColor: colours.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colours.border,
    overflow: 'hidden',
  },
  exampleAccent: {
    width: 4,
  },
  exampleBody: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  exampleName: {
    fontSize: 15,
    fontWeight: '600',
    color: colours.textPrimary,
    marginBottom: 2,
  },
  exampleMeta: {
    fontSize: 12,
    color: colours.textSecondary,
  },
  scanCTA: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colours.border,
    alignSelf: 'flex-start',
    backgroundColor: colours.surface,
  },
  scanCTAText: {
    fontSize: 14,
    color: colours.textSecondary,
    fontWeight: '500',
  },

  // List header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
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
  cameraBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colours.surface,
    borderWidth: 1,
    borderColor: colours.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBtnText: {
    fontSize: 16,
    lineHeight: 20,
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

  // Section list
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 6,
  },
  sectionHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: colours.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  list: {
    paddingBottom: 32,
  },
});
