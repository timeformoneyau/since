import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { createItem } from '../domain/items/service';
import { todayString, formatDisplay, parseDate, formatStorage } from '../utils/dateUtils';
import { colours } from '../components/colours';
import DatePickerModal from '../components/DatePickerModal';
import { addDays } from 'date-fns';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ScanFood'>;

const QUICK_EXPIRY = [
  { label: '3 days', days: 3 },
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
];

function daysUntil(expiryStr: string): number {
  const today = parseDate(todayString());
  const expiry = parseDate(expiryStr);
  return Math.round((expiry.getTime() - today.getTime()) / 86400000);
}

export default function ScanFoodScreen() {
  const navigation = useNavigation<Nav>();
  const nameRef = useRef<TextInput>(null);

  const defaultExpiry = formatStorage(addDays(parseDate(todayString()), 7));

  const [name, setName] = useState('');
  const [expiryDate, setExpiryDate] = useState(defaultExpiry);
  const [showDatePicker, setShowDatePicker] = useState(false);

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;

    const days = daysUntil(expiryDate);
    // Store as a repeat-every-N-days item where N = days until expiry,
    // last done = today. This makes the status system reflect how fresh the item is.
    const repeatValue = Math.max(1, days);

    await createItem({
      name: trimmed,
      category: 'Kitchen',
      lastDoneDate: todayString(),
      repeatValue,
      repeatUnit: 'days',
    });

    navigation.goBack();
  }

  const canSave = name.trim().length > 0;
  const days = daysUntil(expiryDate);

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
        <Text style={styles.screenLabel}>Food item</Text>

        {/* Name */}
        <TextInput
          ref={nameRef}
          style={styles.nameInput}
          placeholder="What is it?"
          placeholderTextColor={colours.textMuted}
          value={name}
          onChangeText={setName}
          autoCapitalize="sentences"
          returnKeyType="done"
          autoFocus
        />

        {/* Expiry */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Expires</Text>
          <TouchableOpacity
            style={styles.rowButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.rowButtonText}>
              {formatDisplay(parseDate(expiryDate))}
              {days === 0 ? '  · today' : days === 1 ? '  · tomorrow' : days > 0 ? `  · in ${days} days` : '  · expired'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick expiry chips */}
        <View style={styles.quickRow}>
          {QUICK_EXPIRY.map((q) => {
            const d = formatStorage(addDays(parseDate(todayString()), q.days));
            const active = d === expiryDate;
            return (
              <TouchableOpacity
                key={q.label}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setExpiryDate(d)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {q.label}
                </Text>
              </TouchableOpacity>
            );
          })}
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
          value={expiryDate}
          onConfirm={(d) => { setExpiryDate(d); setShowDatePicker(false); }}
          onCancel={() => setShowDatePicker(false)}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 60 },

  screenLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colours.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  nameInput: {
    fontSize: 24,
    fontWeight: '600',
    color: colours.textPrimary,
    paddingVertical: 8,
    paddingHorizontal: 0,
    borderBottomWidth: 1.5,
    borderBottomColor: colours.border,
    marginBottom: 28,
  },

  fieldGroup: { marginBottom: 12 },
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
  rowButtonText: { fontSize: 15, color: colours.textPrimary },

  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 32,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.surface,
  },
  chipActive: {
    backgroundColor: colours.textPrimary,
    borderColor: colours.textPrimary,
  },
  chipText: {
    fontSize: 13,
    color: colours.textSecondary,
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },

  saveBtn: {
    backgroundColor: colours.textPrimary,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.35 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
