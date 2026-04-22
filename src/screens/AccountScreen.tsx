import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { getUser, signOut, deleteAccount } from '../domain/auth/service';
import { colours } from '../components/colours';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Account'>;

export default function AccountScreen() {
  const navigation = useNavigation<Nav>();
  const [email, setEmail] = useState('');

  useEffect(() => {
    getUser().then((user) => {
      if (user?.email) setEmail(user.email);
    });
  }, []);

  async function handleSignOut() {
    Alert.alert('Sign out', 'You\'ll need to sign back in to access your data.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          // App.tsx auth gate handles navigation automatically
        },
      },
    ]);
  }

  async function handleDeleteAccount() {
    Alert.alert(
      'Delete account',
      'This permanently deletes your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete my account',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'Could not delete account. Please try again.');
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Avatar + email */}
        <View style={styles.profileBlock}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>
              {email ? email[0].toUpperCase() : '?'}
            </Text>
          </View>
          <Text style={styles.emailText}>{email || 'Loading…'}</Text>
        </View>

        {/* Security section */}
        <Text style={styles.sectionTitle}>Security</Text>
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('ChangePassword')}
          >
            <Text style={styles.rowLabel}>Change password</Text>
            <Text style={styles.rowChevron}>›</Text>
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity style={styles.row} onPress={handleSignOut}>
            <Text style={styles.rowLabel}>Sign out</Text>
            <Text style={styles.rowChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Danger zone */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.section}>
          <TouchableOpacity style={styles.row} onPress={handleDeleteAccount}>
            <Text style={[styles.rowLabel, { color: colours.destructive }]}>
              Delete account
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.deleteNote}>
          Deleting your account permanently removes all your data from our servers.
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colours.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 48,
  },
  profileBlock: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colours.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarLetter: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '600',
  },
  emailText: {
    fontSize: 15,
    color: colours.textSecondary,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colours.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 8,
  },
  section: {
    backgroundColor: colours.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colours.border,
    marginBottom: 28,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  rowLabel: {
    fontSize: 15,
    color: colours.textPrimary,
  },
  rowChevron: {
    fontSize: 20,
    color: colours.textMuted,
    lineHeight: 22,
  },
  separator: {
    height: 1,
    backgroundColor: colours.border,
    marginLeft: 16,
  },
  deleteNote: {
    fontSize: 12,
    color: colours.textMuted,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});
