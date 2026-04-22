import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types';
import { sendPasswordReset } from '../../domain/auth/service';
import { colours } from '../../components/colours';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<Nav>();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleReset() {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await sendPasswordReset(trimmedEmail);
      setSent(true);
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>Check your email</Text>
        <Text style={styles.body}>
          We sent a password reset link to{'\n'}
          <Text style={styles.emailHighlight}>{email}</Text>
          {'\n\n'}
          Follow the link to set a new password, then sign back in.
        </Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('SignIn')}
        >
          <Text style={styles.primaryBtnText}>Back to sign in</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        <Text style={styles.heading}>Forgot password?</Text>
        <Text style={styles.body}>
          Enter your email and we'll send you a reset link.
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={(t) => { setEmail(t); setError(''); }}
            placeholder="you@example.com"
            placeholderTextColor={colours.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleReset}
          />
        </View>

        {error !== '' && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[styles.primaryBtn, loading && styles.btnDisabled]}
          onPress={handleReset}
          disabled={loading}
        >
          <Text style={styles.primaryBtnText}>
            {loading ? 'Sending…' : 'Send reset link'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.navigate('SignIn')}
        >
          <Text style={styles.backText}>← Back to sign in</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colours.background },
  container: {
    flex: 1,
    backgroundColor: colours.background,
    paddingHorizontal: 28,
    paddingTop: 80,
  },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    color: colours.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  body: {
    fontSize: 15,
    color: colours.textSecondary,
    lineHeight: 22,
    marginBottom: 32,
  },
  emailHighlight: {
    color: colours.textPrimary,
    fontWeight: '600',
  },
  field: {
    gap: 6,
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colours.textMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colours.surface,
    borderWidth: 1,
    borderColor: colours.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: colours.textPrimary,
  },
  errorText: {
    fontSize: 13,
    color: colours.destructive,
    marginBottom: 8,
  },
  primaryBtn: {
    backgroundColor: colours.textPrimary,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  btnDisabled: { opacity: 0.5 },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  backBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  backText: {
    fontSize: 14,
    color: colours.textSecondary,
  },
});
