import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, CompletionEvent } from '../types';
import { getDerivedItemById } from '../domain/items/service';
import { getSignedPhotoUrl } from '../domain/events/upload';
import { formatDisplay, parseDate } from '../utils/dateUtils';
import { colours } from '../components/colours';

type Nav = NativeStackNavigationProp<RootStackParamList, 'EventDetail'>;
type Route = RouteProp<RootStackParamList, 'EventDetail'>;

function formatCurrency(amount: number, currency?: string | null): string {
  const symbol = currency?.toUpperCase() === 'USD' ? '$'
    : currency?.toUpperCase() === 'GBP' ? '£'
    : currency?.toUpperCase() === 'EUR' ? '€'
    : currency?.toUpperCase() === 'AUD' ? 'A$'
    : '';
  return `${symbol}${amount.toFixed(2)}`;
}

export default function EventDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { itemId, eventId } = route.params;

  const [event, setEvent] = useState<CompletionEvent | null>(null);
  const [itemName, setItemName] = useState('');
  const [signedPhotoUrl, setSignedPhotoUrl] = useState<string | null>(null);
  const [loadingPhoto, setLoadingPhoto] = useState(false);

  useEffect(() => {
    (async () => {
      const item = await getDerivedItemById(itemId);
      if (!item) return;
      setItemName(item.name);
      const found = item.history.find((e) => e.id === eventId) ?? null;
      setEvent(found);

      if (found?.photos?.[0]?.storagePath) {
        setLoadingPhoto(true);
        try {
          const url = await getSignedPhotoUrl(found.photos[0].storagePath);
          setSignedPhotoUrl(url);
        } catch {}
        setLoadingPhoto(false);
      }
    })();
  }, [itemId, eventId]);

  function openHedera(txId: string) {
    // Format: 0.0.accountNum@seconds.nanos → hashscan uses the tx ID directly
    const url = `https://hashscan.io/mainnet/transaction/${txId}`;
    Linking.openURL(url);
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator style={{ marginTop: 60 }} color={colours.textMuted} />
      </SafeAreaView>
    );
  }

  const hasPhoto = (event.photos?.length ?? 0) > 0;
  const extracted = event.extractedData;
  const hasExtracted = extracted && Object.values(extracted).some(Boolean);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colours.background} />

      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.navBack}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>{itemName}</Text>
        <View style={{ minWidth: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Date header */}
        <Text style={styles.dateHeading}>
          {formatDisplay(parseDate(event.date))}
        </Text>

        {/* Notes */}
        {event.notes ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>NOTES</Text>
            <Text style={styles.notesText}>{event.notes}</Text>
          </View>
        ) : null}

        {/* Photo */}
        {hasPhoto && (
          <View style={styles.photoSection}>
            <Text style={styles.sectionTitle}>EVIDENCE</Text>
            {loadingPhoto ? (
              <View style={styles.photoPlaceholder}>
                <ActivityIndicator color={colours.textMuted} />
              </View>
            ) : signedPhotoUrl ? (
              <Image
                source={{ uri: signedPhotoUrl }}
                style={styles.photo}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="image-outline" size={32} color={colours.textMuted} />
                <Text style={styles.photoError}>Photo unavailable</Text>
              </View>
            )}
          </View>
        )}

        {/* Extracted data */}
        {hasExtracted && (
          <>
            <Text style={styles.sectionTitle}>EXTRACTED FROM RECEIPT</Text>
            <View style={styles.card}>
              {extracted!.vendor ? (
                <Row label="Vendor" value={extracted!.vendor!} />
              ) : null}
              {extracted!.amount != null ? (
                <Row
                  label="Amount"
                  value={formatCurrency(extracted!.amount, extracted!.currency)}
                />
              ) : null}
              {extracted!.receiptDate ? (
                <Row label="Receipt date" value={extracted!.receiptDate!} />
              ) : null}
              {extracted!.description ? (
                <Row label="Description" value={extracted!.description!} last />
              ) : null}
            </View>
          </>
        )}

        {/* Hedera proof */}
        {event.hederaTxId ? (
          <>
            <Text style={styles.sectionTitle}>IMMUTABLE PROOF</Text>
            <View style={styles.hederaCard}>
              <View style={styles.hederaHeader}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#00A3A1" />
                <Text style={styles.hederaTitle}>Recorded on Hedera</Text>
              </View>
              <Text style={styles.hederaTxId} selectable>{event.hederaTxId}</Text>
              <Text style={styles.hederaExplain}>
                This event was timestamped on the Hedera Consensus Service — a public,
                tamper-proof ledger. The record cannot be altered or deleted.
              </Text>
              <TouchableOpacity
                style={styles.hederaVerifyBtn}
                onPress={() => openHedera(event.hederaTxId!)}
              >
                <Text style={styles.hederaVerifyText}>Verify on HashScan ↗</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : hasPhoto ? (
          // Photo was attached but no Hedera record (edge function not set up yet)
          <View style={styles.pendingCard}>
            <Ionicons name="time-outline" size={16} color={colours.textMuted} />
            <Text style={styles.pendingText}>
              Hedera timestamping not yet configured. Set up the Edge Function to enable immutable proof.
            </Text>
          </View>
        ) : null}

      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
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
    paddingBottom: 8,
  },
  navBack: { fontSize: 15, color: colours.textSecondary, minWidth: 60 },
  navTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colours.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },

  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 48 },

  dateHeading: {
    fontSize: 24,
    fontWeight: '700',
    color: colours.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colours.textMuted,
    letterSpacing: 0.9,
    marginBottom: 10,
    marginTop: 4,
  },

  card: {
    backgroundColor: colours.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colours.border,
    marginBottom: 24,
    overflow: 'hidden',
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colours.textMuted,
    letterSpacing: 0.8,
    paddingHorizontal: 14,
    paddingTop: 12,
    marginBottom: 6,
  },
  notesText: {
    fontSize: 15,
    color: colours.textPrimary,
    lineHeight: 22,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },

  photoSection: { marginBottom: 24 },
  photo: {
    width: '100%',
    height: 300,
    borderRadius: 10,
    backgroundColor: colours.border,
  },
  photoPlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    backgroundColor: colours.surface,
    borderWidth: 1,
    borderColor: colours.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoError: { fontSize: 13, color: colours.textMuted },

  row: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colours.border },
  rowLabel: { fontSize: 13, color: colours.textSecondary },
  rowValue: { fontSize: 13, fontWeight: '600', color: colours.textPrimary, flex: 1, textAlign: 'right' },

  hederaCard: {
    backgroundColor: '#F0FAFA',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#B2DFDB',
    padding: 16,
    marginBottom: 24,
    gap: 10,
  },
  hederaHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hederaTitle: { fontSize: 15, fontWeight: '600', color: '#00A3A1' },
  hederaTxId: {
    fontSize: 11,
    color: colours.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    backgroundColor: colours.border,
    padding: 8,
    borderRadius: 6,
  },
  hederaExplain: { fontSize: 13, color: colours.textSecondary, lineHeight: 18 },
  hederaVerifyBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#00A3A1',
    borderRadius: 6,
  },
  hederaVerifyText: { fontSize: 13, fontWeight: '600', color: '#fff' },

  pendingCard: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colours.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colours.border,
    padding: 14,
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  pendingText: { fontSize: 13, color: colours.textMuted, flex: 1, lineHeight: 18 },
});
