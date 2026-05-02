import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, RepeatUnit, DEFAULT_CATEGORIES } from '../types';
import { createItem } from '../domain/items/service';
import { todayString, formatDisplay, parseDate } from '../utils/dateUtils';
import { getSuggestion } from '../utils/suggestions';
import { colours } from '../components/colours';
import DatePickerModal from '../components/DatePickerModal';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Add'>;

const REPEAT_UNITS: RepeatUnit[] = ['days', 'weeks', 'months', 'years'];

export default function AddItemScreen() {
  const navigation = useNavigation<Nav>();
  const nameRef = useRef<TextInput>(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Other');
  const [lastDoneDate, setLastDoneDate] = useState(todayString());
  const [repeatValue, setRepeatValue] = useState('');
  const [repeatUnit, setRepeatUnit] = useState<RepeatUnit>('months');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [suggestion, setSuggestion] = useState<{ repeatValue: number; repeatUnit: RepeatUnit } | null>(null);
  const [suggestionApplied, setSuggestionApplied] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => nameRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setSuggestion(getSuggestion(name));
    setSuggestionApplied(false);
  }, [name]);

  function applySuggestion() {
    if (!suggestion) return;
    setRepeatValue(String(suggestion.repeatValue));
    setRepeatUnit(suggestion.repeatUnit);
    setSuggestionApplied(true);
  }

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;

    const rv = repeatValue ? parseInt(repeatValue, 10) : null;
    const hasRepeat = rv !== null && rv > 0;

    await createItem({
      name: trimmed,
      category,
      lastDoneDate,
      repeatValue: hasRepeat ? rv : null,
      repeatUnit: hasRepeat ? repeatUnit : null,
    });

    navigation.goBack();
  }

  const canSave = name.trim().length > 0;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.closeBtn}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Item</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Event name */}
          <Text style={styles.fieldLabel}>EVENT NAME</Text>
          <TextInput
            ref={nameRef}
            style={styles.nameInput}
            placeholder="e.g. Dentist"
            placeholderTextColor={colours.textMuted}
            value={name}
            onChangeText={setName}
            autoCapitalize="sentences"
            returnKeyType="done"
          />

          {/* Suggestion banner */}
          {suggestion && !suggestionApplied && repeatValue === '' && (
            <TouchableOpacity style={styles.suggestionBanner} onPress={applySuggestion}>
              <Text style={styles.suggestionIcon}>💡</Text>
              <Text style={styles.suggestionText}>
                Based on '{name}', most people go every {suggestion.repeatValue} {suggestion.repeatUnit}.
              </Text>
              <Text style={styles.suggestionApply}>APPLY SUGGESTION</Text>
            </TouchableOpacity>
          )}

          {/* Last done */}
          <Text style={styles.fieldLabel}>LAST DONE</Text>
          <TouchableOpacity
            style={styles.dateBtn}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateBtnIcon}>📅</Text>
            <Text style={styles.dateBtnText}>
              {formatDisplay(parseDate(lastDoneDate))}
            </Text>
            <Text style={styles.dateBtnChevron}>⌄</Text>
          </TouchableOpacity>

          {/* Category chips */}
          <Text style={styles.fieldLabel}>CATEGORY</Text>
          <View style={styles.categoryChips}>
            {DEFAULT_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, category === cat && styles.chipActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Repeat every */}
          <Text style={styles.fieldLabel}>REPEAT EVERY</Text>
          <View style={styles.repeatRow}>
            <View style={styles.repeatNumBox}>
              <TextInput
                style={styles.repeatNumInput}
                placeholder="—"
                placeholderTextColor={colours.textMuted}
                value={repeatValue}
                onChangeText={(t) => setRepeatValue(t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                maxLength={4}
                textAlign="center"
              />
            </View>
            <View style={styles.repeatUnitBox}>
              {REPEAT_UNITS.map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[styles.unitBtn, repeatUnit === u && styles.unitBtnActive]}
                  onPress={() => setRepeatUnit(u)}
                >
                  <Text style={[styles.unitBtnText, repeatUnit === u && styles.unitBtnTextActive]}>
                    {u.charAt(0).toUpperCase() + u.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Save */}
          <TouchableOpacity
            style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!canSave}
          >
            <Text style={styles.saveBtnText}>Add Item</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {showDatePicker && (
        <DatePickerModal
          value={lastDoneDate}
          onConfirm={(d) => { setLastDoneDate(d); setShowDatePicker(false); }}
          onCancel={() => setShowDatePicker(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colours.background,
  },
  flex: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colours.border,
  },
  closeBtn: {
    fontSize: 18,
    color: colours.textSecondary,
    fontWeight: '400',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colours.textPrimary,
  },
  headerRight: {
    width: 24,
  },

  content: {
    padding: 20,
    paddingBottom: 60,
  },

  // Field label
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colours.textMuted,
    letterSpacing: 0.9,
    marginBottom: 10,
    marginTop: 20,
  },

  // Name input
  nameInput: {
    fontSize: 28,
    fontWeight: '600',
    color: colours.textPrimary,
    paddingVertical: 6,
    borderBottomWidth: 1.5,
    borderBottomColor: colours.border,
    marginBottom: 4,
  },

  // Suggestion banner
  suggestionBanner: {
    backgroundColor: '#FFF8EE',
    borderRadius: 10,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#F0D9B0',
  },
  suggestionIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  suggestionText: {
    fontSize: 13,
    color: '#7A5C2A',
    lineHeight: 18,
    marginBottom: 8,
  },
  suggestionApply: {
    fontSize: 11,
    fontWeight: '700',
    color: colours.amber,
    letterSpacing: 0.6,
  },

  // Date button
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colours.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colours.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  dateBtnIcon: {
    fontSize: 15,
    marginRight: 10,
  },
  dateBtnText: {
    flex: 1,
    fontSize: 15,
    color: colours.textPrimary,
  },
  dateBtnChevron: {
    fontSize: 16,
    color: colours.textMuted,
  },

  // Category chips
  categoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colours.border,
    backgroundColor: colours.surface,
  },
  chipActive: {
    backgroundColor: colours.textPrimary,
    borderColor: colours.textPrimary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colours.textSecondary,
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },

  // Repeat
  repeatRow: {
    flexDirection: 'row',
    gap: 10,
  },
  repeatNumBox: {
    width: 70,
    backgroundColor: colours.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colours.border,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 13,
  },
  repeatNumInput: {
    fontSize: 22,
    fontWeight: '700',
    color: colours.textPrimary,
    width: '100%',
  },
  repeatUnitBox: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: colours.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colours.border,
    overflow: 'hidden',
  },
  unitBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colours.border,
  },
  unitBtnActive: {
    backgroundColor: '#F5F0E8',
  },
  unitBtnText: {
    fontSize: 13,
    color: colours.textSecondary,
    fontWeight: '500',
  },
  unitBtnTextActive: {
    color: colours.amber,
    fontWeight: '700',
  },

  // Save button
  saveBtn: {
    backgroundColor: colours.textPrimary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 32,
  },
  saveBtnDisabled: { opacity: 0.35 },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
