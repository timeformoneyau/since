import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DEFAULT_CATEGORIES } from '../types';
import { colours } from './colours';
import { getCategoryIcon } from './categoryIcons';
import { loadCustomCategories, addCustomCategory } from '../domain/categories/storage';

interface Props {
  value: string;
  onSelect: (category: string) => void;
  onCancel: () => void;
}

export default function CategoryPicker({ value, onSelect, onCancel }: Props) {
  const [allCategories, setAllCategories] = useState<string[]>([...DEFAULT_CATEGORIES]);
  const [showNewInput, setShowNewInput] = useState(false);
  const [newName, setNewName] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    loadCustomCategories().then((custom) => {
      setAllCategories([...DEFAULT_CATEGORIES, ...custom]);
    });
  }, []);

  useEffect(() => {
    if (showNewInput) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [showNewInput]);

  async function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    await addCustomCategory(trimmed);
    const custom = await loadCustomCategories();
    setAllCategories([...DEFAULT_CATEGORIES, ...custom]);
    setNewName('');
    setShowNewInput(false);
    onSelect(trimmed);
  }

  return (
    <Modal transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kvContainer}
      >
        <View style={styles.sheet}>
          <View style={styles.toolbar}>
            <TouchableOpacity onPress={onCancel}>
              <Text style={styles.toolbarCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.toolbarTitle}>Category</Text>
            <View style={{ width: 52 }} />
          </View>

          <FlatList
            data={allCategories}
            keyExtractor={(item) => item}
            renderItem={({ item }) => {
              const iconName = getCategoryIcon(item) as any;
              return (
                <TouchableOpacity style={styles.row} onPress={() => onSelect(item)}>
                  <Ionicons name={iconName} size={18} color={colours.textSecondary} style={styles.rowIcon} />
                  <Text style={[styles.rowText, item === value && styles.rowTextSelected]}>
                    {item}
                  </Text>
                  {item === value && (
                    <Ionicons name="checkmark" size={16} color={colours.textPrimary} />
                  )}
                </TouchableOpacity>
              );
            }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />

          <View style={styles.separator} />

          {showNewInput ? (
            <View style={styles.newRow}>
              <TextInput
                ref={inputRef}
                style={styles.newInput}
                placeholder="Category name"
                placeholderTextColor={colours.textMuted}
                value={newName}
                onChangeText={setNewName}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={handleAdd}
              />
              <TouchableOpacity
                style={[styles.addBtn, !newName.trim() && styles.addBtnDisabled]}
                onPress={handleAdd}
                disabled={!newName.trim()}
              >
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.newCategoryBtn}
              onPress={() => setShowNewInput(true)}
            >
              <Ionicons name="add-circle-outline" size={18} color={colours.amber} />
              <Text style={styles.newCategoryText}>New category</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  kvContainer: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colours.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
    paddingBottom: 32,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colours.border,
  },
  toolbarCancel: { fontSize: 15, color: colours.textSecondary },
  toolbarTitle: { fontSize: 15, fontWeight: '600', color: colours.textPrimary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 20,
  },
  rowIcon: {
    marginRight: 12,
  },
  rowText: { flex: 1, fontSize: 15, color: colours.textPrimary },
  rowTextSelected: { fontWeight: '600' },
  separator: { height: 1, backgroundColor: colours.border, marginHorizontal: 20 },
  newCategoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 10,
  },
  newCategoryText: {
    fontSize: 15,
    color: colours.amber,
    fontWeight: '500',
  },
  newRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 10,
  },
  newInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colours.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 15,
    color: colours.textPrimary,
    backgroundColor: colours.surface,
  },
  addBtn: {
    backgroundColor: colours.textPrimary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  addBtnDisabled: { opacity: 0.35 },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
