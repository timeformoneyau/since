import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, TabParamList } from '../types';
import { getUser, signOut, deleteAccount } from '../domain/auth/service';
import { colours } from '../components/colours';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Account'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function AccountScreen() {
  const navigation = useNavigation<Nav>();
  const [email, setEmail] = useState('');

  useEffect(() => {
    getUser().then((user) => {
      if (user?.email) setEmail(user.email);
    });
  }, []);

  const displayName = email ? email.split('@')[0] : '';

  async function handleSignOut() {
    Alert.alert('Sign out', "You'll need to sign back in to access your data.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => { await signOut(); },
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
      <StatusBar barStyle="dark-content" backgroundColor={colours.background} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Profile block */}
        <View style={styles.profileBlock}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>
              {email ? email[0].toUpperCase() : '?'}
            </Text>
          </View>
          {displayName !== '' && (
            <Text style={styles.displayName}>{displayName}</Text>
          )}
          <Text style={styles.emailText}>{email || 'Loading…'}</Text>
        </View>

        {/* Account section */}
        <Text style={styles.sectionTitle}>ACCOUNT</Text>
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('ChangePassword')}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="lock-closed-outline" size={18} color={colours.textSecondary} style={styles.rowIcon} />
              <Text style={styles.rowLabel}>Change password</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colours.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Danger actions */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.row} onPress={handleSignOut}>
            <View style={styles.rowLeft}>
              <Ionicons name="log-out-outline" size={18} color={colours.destructive} style={styles.rowIcon} />
              <Text style={[styles.rowLabel, { color: colours.destructive }]}>Sign out</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity style={styles.row} onPress={handleDeleteAccount}>
            <View style={styles.rowLeft}>
              <Ionicons name="trash-outline" size={18} color={colours.destructive} style={styles.rowIcon} />
              <Text style={[styles.rowLabel, { color: colours.destructive }]}>Delete account</Text>
            </View>
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
    paddingTop: 16,
    paddingBottom: 48,
  },

  // Profile
  profileBlock: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colours.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarLetter: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '600',
  },
  displayName: {
    fontSize: 20,
    fontWeight: '700',
    color: colours.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  emailText: {
    fontSize: 14,
    color: colours.amber,
    fontWeight: '500',
  },

  // Sections
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colours.textMuted,
    letterSpacing: 0.9,
    marginBottom: 8,
    marginTop: 4,
  },
  section: {
    backgroundColor: colours.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colours.border,
    marginBottom: 24,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowIcon: {
    marginRight: 12,
  },
  rowLabel: {
    fontSize: 15,
    color: colours.textPrimary,
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
    marginTop: 8,
  },
});
