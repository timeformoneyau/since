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
import { RootStackParamList, RepeatUnit } from '../types';
import { createItem } from '../domain/items/service';
import { todayString, formatDisplay, parseDate } from '../utils/dateUtils';
import { getSuggestion } from '../utils/suggestions';
import { colours } from '../components/colours';
import DatePickerModal from '../components/DatePickerModal';
import CategoryPicker from '../components/CategoryPicker';

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
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
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
      notes: notes.trim() || null,
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
              <View style={styles.suggestionContent}>
                <Text style={styles.suggestionText}>
                  Based on '{name}', most people go every {suggestion.repeatValue} {suggestion.repeatUnit}.
                </Text>
                <Text style={styles.suggestionApply}>APPLY SUGGESTION</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Last done */}
          <Text style={styles.fieldLabel}>LAST DONE</Text>
          <TouchableOpacity style={styles.rowBtn} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.rowBtnIcon}>📅</Text>
            <Text style={styles.rowBtnText}>{formatDisplay(parseDate(lastDoneDate))}</Text>
            <Text style={styles.rowBtnChevron}>⌄</Text>
          </TouchableOpacity>

          {/* Category */}
          <Text style={styles.fieldLabel}>CATEGORY</Text>
          <TouchableOpacity style={styles.rowBtn} onPress={() => setShowCategoryPicker(true)}>
            <Text style={styles.rowBtnText}>{category}</Text>
            <Text style={styles.rowBtnChevron}>⌄</Text>
          </TouchableOpacity>

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
            <View style={styles.unitRow}>
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

          {/* Notes */}
          <Text style={styles.fieldLabel}>NOTES</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Add a note about this item..."
            placeholderTextColor={colours.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

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

      {showCategoryPicker && (
        <CategoryPicker
          value={category}
          onSelect={(c) => { setCategory(c); setShowCategoryPicker(false); }}
          onCancel={() => setShowCategoryPicker(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colours.background },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colours.border,
    backgroundColor: colours.surface,
  },
  closeBtn: { fontSize: 18, color: colours.textSecondary },
  headerTitle: { fontSize: 16, fontWeight: '600', color: colours.textPrimary },
  headerRight: { width: 24 },

  content: { padding: 20, paddingBottom: 60 },

  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colours.textMuted,
    letterSpacing: 0.9,
    marginBottom: 8,
    marginTop: 20,
  },

  nameInput: {
    fontSize: 26,
    fontWeight: '600',
    color: colours.textPrimary,
    paddingVertical: 6,
    borderBottomWidth: 1.5,
    borderBottomColor: colours.border,
  },

  suggestionBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFF8EE',
    borderRadius: 10,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#F0D9B0',
    alignItems: 'flex-start',
    gap: 10,
  },
  suggestionIcon: { fontSize: 16, lineHeight: 20 },
  suggestionContent: { flex: 1 },
  suggestionText: { fontSize: 13, color: '#7A5C2A', lineHeight: 18, marginBottom: 6 },
  suggestionApply: { fontSize: 11, fontWeight: '700', color: colours.amber, letterSpacing: 0.6 },

  rowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colours.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colours.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  rowBtnIcon: { fontSize: 15, marginRight: 10 },
  rowBtnText: { flex: 1, fontSize: 15, color: colours.textPrimary },
  rowBtnChevron: { fontSize: 16, color: colours.textMuted },

  repeatRow: { flexDirection: 'row', gap: 10 },
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
  unitRow: {
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
  unitBtnActive: { backgroundColor: '#F5F0E8' },
  unitBtnText: { fontSize: 13, color: colours.textSecondary, fontWeight: '500' },
  unitBtnTextActive: { color: colours.amber, fontWeight: '700' },

  notesInput: {
    backgroundColor: colours.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colours.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colours.textPrimary,
    minHeight: 80,
    lineHeight: 20,
  },

  saveBtn: {
    backgroundColor: colours.textPrimary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 32,
  },
  saveBtnDisabled: { opacity: 0.35 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600', letterSpacing: 0.2 },
});
