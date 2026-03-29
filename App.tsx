import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

// Catch any import-time errors
let importError: string | null = null;
let NavigationContainer: any = null;
let SafeAreaProvider: any = null;

try {
  NavigationContainer = require('@react-navigation/native').NavigationContainer;
} catch (e: any) {
  importError = 'NavigationContainer failed: ' + e.message;
}

try {
  SafeAreaProvider = require('react-native-safe-area-context').SafeAreaProvider;
} catch (e: any) {
  importError = (importError ?? '') + '\nSafeAreaProvider failed: ' + e.message;
}

export default function App() {
  const [error, setError] = useState<string | null>(importError);
  const [log, setLog] = useState<string[]>(['App mounted']);

  useEffect(() => {
    const msgs: string[] = [];
    try {
      require('./src/types');
      msgs.push('✓ types');
    } catch (e: any) { msgs.push('✗ types: ' + e.message); }

    try {
      require('./src/storage/items');
      msgs.push('✓ storage');
    } catch (e: any) { msgs.push('✗ storage: ' + e.message); }

    try {
      require('./src/utils/dateUtils');
      msgs.push('✓ dateUtils');
    } catch (e: any) { msgs.push('✗ dateUtils: ' + e.message); }

    try {
      require('./src/utils/statusUtils');
      msgs.push('✓ statusUtils');
    } catch (e: any) { msgs.push('✗ statusUtils: ' + e.message); }

    try {
      require('./src/notifications/scheduler');
      msgs.push('✓ scheduler');
    } catch (e: any) { msgs.push('✗ scheduler: ' + e.message); }

    try {
      require('./src/screens/MainListScreen');
      msgs.push('✓ MainListScreen');
    } catch (e: any) { msgs.push('✗ MainListScreen: ' + e.message); }

    try {
      require('./src/screens/AddItemScreen');
      msgs.push('✓ AddItemScreen');
    } catch (e: any) { msgs.push('✗ AddItemScreen: ' + e.message); }

    try {
      require('./src/screens/EditItemScreen');
      msgs.push('✓ EditItemScreen');
    } catch (e: any) { msgs.push('✗ EditItemScreen: ' + e.message); }

    setLog(msgs);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Since — Diagnostics</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      <ScrollView>
        {log.map((line, i) => (
          <Text key={i} style={line.startsWith('✓') ? styles.ok : styles.fail}>
            {line}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 32, paddingTop: 60, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 20 },
  error: { color: 'red', marginBottom: 12 },
  ok: { fontSize: 14, color: 'green', marginBottom: 4 },
  fail: { fontSize: 14, color: 'red', marginBottom: 4 },
});
