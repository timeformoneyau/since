import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, RepeatUnit, DEFAULT_CATEGORIES } from '../types';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
import { addItem } from '../storage/items';
import { todayString, formatDisplay, parseDate } from '../utils/dateUtils';
import { scheduleItemNotifications } from '../notifications/scheduler';
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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // Suggestion state
  const [suggestion, setSuggestion] = useState<{ repeatValue: number; repeatUnit: RepeatUnit } | null>(null);
  const [suggestionApplied, setSuggestionApplied] = useState(false);

  useEffect(() => {
    setTimeout(() => nameRef.current?.focus(), 100);
  }, []);

  useEffect(() => {
    const s = getSuggestion(name);
    setSuggestion(s);
    if (s && !suggestionApplied) {
      // Only auto-fill if repeat fields are still blank
    }
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
    const ru = rv && rv > 0 ? repeatUnit : null;

    const item = {
      id: generateId(),
      name: trimmed,
      category,
      lastDoneDate,
      repeatValue: rv && rv > 0 ? rv : null,
      repeatUnit: ru,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await addItem(item);
    await scheduleItemNotifications(item);
    navigation.goBack();
  }

  const canSave = name.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colours.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Name */}
        <View style={styles.field}>
          <TextInput
            ref={nameRef}
            style={styles.nameInput}
            placeholder="What have you done?"
            placeholderTextColor={colours.textMuted}
            value={name}
            onChangeText={(t) => { setName(t); setSuggestionApplied(false); }}
            autoCapitalize="sentences"
            returnKeyType="done"
          />
        </View>

        {/* Suggestion banner */}
        {suggestion && !suggestionApplied && repeatValue === '' && (
          <TouchableOpacity style={styles.suggestionBanner} onPress={applySuggestion}>
            <Text style={styles.suggestionText}>
              Suggested: every {suggestion.repeatValue} {suggestion.repeatUnit}
            </Text>
            <Text style={styles.suggestionApply}>Apply</Text>
          </TouchableOpacity>
        )}

        {/* Last done */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Last done</Text>
          <TouchableOpacity
            style={styles.rowButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.rowButtonText}>
              {formatDisplay(parseDate(lastDoneDate))}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Category */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Category</Text>
          <TouchableOpacity
            style={styles.rowButton}
            onPress={() => setShowCategoryPicker(true)}
          >
            <Text style={styles.rowButtonText}>{category}</Text>
          </TouchableOpacity>
        </View>

        {/* Repeat every */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Repeat every</Text>
          <View style={styles.repeatRow}>
            <TextInput
              style={styles.repeatInput}
              placeholder="—"
              placeholderTextColor={colours.textMuted}
              value={repeatValue}
              onChangeText={(t) => setRepeatValue(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              maxLength={4}
            />
            <View style={styles.unitRow}>
              {REPEAT_UNITS.map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[
                    styles.unitBtn,
                    repeatUnit === u && styles.unitBtnActive,
                  ]}
                  onPress={() => setRepeatUnit(u)}
                >
                  <Text
                    style={[
                      styles.unitBtnText,
                      repeatUnit === u && styles.unitBtnTextActive,
                    ]}
                  >
                    {u}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!canSave}
        >
          <Text style={styles.saveBtnText}>Track this</Text>
        </TouchableOpacity>
      </ScrollView>

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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 60,
  },
  field: {
    marginBottom: 8,
  },
  nameInput: {
    fontSize: 24,
    fontWeight: '600',
    color: colours.textPrimary,
    paddingVertical: 8,
    paddingHorizontal: 0,
    borderBottomWidth: 1.5,
    borderBottomColor: colours.border,
    marginBottom: 16,
  },
  suggestionBanner: {
    backgroundColor: '#FFF8EE',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F0D9B0',
  },
  suggestionText: {
    fontSize: 13,
    color: '#7A5C2A',
  },
  suggestionApply: {
    fontSize: 13,
    fontWeight: '600',
    color: '#C8842A',
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colours.textMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  rowButton: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colours.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colours.border,
  },
  rowButtonText: {
    fontSize: 15,
    color: colours.textPrimary,
  },
  repeatRow: {
    gap: 10,
  },
  repeatInput: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colours.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colours.border,
    fontSize: 15,
    color: colours.textPrimary,
    marginBottom: 6,
  },
  unitRow: {
    flexDirection: 'row',
    gap: 8,
  },
  unitBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.surface,
  },
  unitBtnActive: {
    backgroundColor: colours.textPrimary,
    borderColor: colours.textPrimary,
  },
  unitBtnText: {
    fontSize: 13,
    color: colours.textSecondary,
  },
  unitBtnTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: colours.textPrimary,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  saveBtnDisabled: {
    opacity: 0.35,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
