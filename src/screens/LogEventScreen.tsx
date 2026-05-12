import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { logEvent } from '../domain/items/service';
import { todayString } from '../utils/dateUtils';
import { formatDisplay, parseDate } from '../utils/dateUtils';
import { colours } from '../components/colours';
import DatePickerModal from '../components/DatePickerModal';

type Nav = NativeStackNavigationProp<RootStackParamList, 'LogEvent'>;
type Route = RouteProp<RootStackParamList, 'LogEvent'>;

type PhotoSource = 'camera' | 'library';

export default function LogEventScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { itemId } = route.params;

  const [date, setDate] = useState(todayString());
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  async function pickPhoto(source: PhotoSource) {
    let result;
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera access is required to take photos.');
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
      });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Photo library access is required to attach photos.');
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
      });
    }

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  function showPhotoOptions() {
    Alert.alert('Attach photo', 'Choose a source', [
      { text: 'Take photo', onPress: () => pickPhoto('camera') },
      { text: 'Choose from library', onPress: () => pickPhoto('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await logEvent(itemId, {
        date,
        notes: notes.trim() || null,
        photoUri,
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to save event. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const hasPhoto = !!photoUri;
  const savingWithPhoto = saving && hasPhoto;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colours.background} />

      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} disabled={saving}>
          <Text style={[styles.navCancel, saving && { opacity: 0.4 }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Log Event</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Date */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>DATE</Text>
            <TouchableOpacity
              style={styles.rowButton}
              onPress={() => setShowDatePicker(true)}
              disabled={saving}
            >
              <Text style={styles.rowButtonText}>{formatDisplay(parseDate(date))}</Text>
              <Ionicons name="calendar-outline" size={16} color={colours.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Notes */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>NOTES</Text>
            <TextInput
              style={[styles.textInput, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="What did you do? Any details worth recording…"
              placeholderTextColor={colours.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!saving}
            />
          </View>

          {/* Photo */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>EVIDENCE / RECEIPT</Text>
            {hasPhoto ? (
              <View>
                <Image source={{ uri: photoUri! }} style={styles.photoPreview} resizeMode="cover" />
                <TouchableOpacity
                  style={styles.removePhotoBtn}
                  onPress={() => setPhotoUri(null)}
                  disabled={saving}
                >
                  <Ionicons name="close-circle" size={20} color={colours.destructive} />
                  <Text style={styles.removePhotoText}>Remove photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.photoPickerBtn}
                onPress={showPhotoOptions}
                disabled={saving}
              >
                <Ionicons name="camera-outline" size={22} color={colours.amber} />
                <Text style={styles.photoPickerText}>Attach photo or receipt</Text>
              </TouchableOpacity>
            )}
          </View>

          {savingWithPhoto && (
            <View style={styles.progressBanner}>
              <ActivityIndicator size="small" color={colours.amber} />
              <Text style={styles.progressText}>
                Uploading and analysing receipt…
              </Text>
            </View>
          )}

          {/* Save */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving && !savingWithPhoto ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>
                {saving ? 'Saving…' : 'Save event'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {showDatePicker && (
        <DatePickerModal
          value={date}
          onConfirm={(d) => { setDate(d); setShowDatePicker(false); }}
          onCancel={() => setShowDatePicker(false)}
        />
      )}
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
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colours.border,
  },
  navCancel: { fontSize: 15, color: colours.textSecondary },
  navTitle: { fontSize: 16, fontWeight: '600', color: colours.textPrimary },

  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 60 },

  fieldGroup: { marginBottom: 24 },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: colours.textMuted,
    letterSpacing: 0.8,
    marginBottom: 8,
  },

  rowButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colours.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colours.border,
  },
  rowButtonText: { fontSize: 15, color: colours.textPrimary },

  textInput: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colours.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colours.border,
    fontSize: 15,
    color: colours.textPrimary,
  },
  notesInput: { minHeight: 100, paddingTop: 12 },

  photoPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: colours.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colours.border,
    borderStyle: 'dashed',
  },
  photoPickerText: { fontSize: 15, color: colours.amber, fontWeight: '500' },

  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: colours.border,
  },
  removePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  removePhotoText: { fontSize: 13, color: colours.destructive },

  progressBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  progressText: { fontSize: 13, color: colours.amber, flex: 1 },

  saveBtn: {
    backgroundColor: colours.textPrimary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
