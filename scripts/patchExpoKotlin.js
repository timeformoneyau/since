#!/usr/bin/env node
/**
 * Post-install patches for Expo + React Native 0.76 + Gradle 8.14 compatibility.
 *
 * Patch 1 — ExpoRootProjectPlugin.kt (kotlinVersion):
 *   expo-root-project resolves kotlinVersion via the expoLibs version catalog.
 *   RN 0.76 sets kotlin="1.9.24" in that catalog, which is absent from the KSP
 *   lookup map (only 2.x supported), causing a build failure. We replace the
 *   catalog lookup with a literal "2.1.0".
 *
 * Patch 2 — ReactExtension.kt (enableBundleCompression):
 *   Expo SDK 54's app/build.gradle template sets enableBundleCompression, but
 *   RN 0.76 removed that property from ReactExtension. We add it back as a no-op.
 *
 * Both files are Kotlin sources compiled by Gradle at build time, so patching
 * them during npm postinstall (before Gradle starts) takes effect correctly.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function patch(label, filePath, fn) {
  if (!fs.existsSync(filePath)) {
    console.log(`[patchExpoKotlin] ${label}: file not found — skipping`);
    return;
  }
  const original = fs.readFileSync(filePath, 'utf8');
  const patched = fn(original);
  if (patched === original) {
    console.log(`[patchExpoKotlin] ${label}: already patched or pattern changed`);
  } else {
    fs.writeFileSync(filePath, patched);
    console.log(`[patchExpoKotlin] ${label}: patched OK`);
  }
}

// Patch 1: hardcode kotlinVersion in ExpoRootProjectPlugin.kt
patch(
  'ExpoRootProjectPlugin.kt (kotlinVersion)',
  path.join(
    ROOT,
    'node_modules/expo-modules-autolinking/android/expo-gradle-plugin',
    'expo-autolinking-plugin/src/main/kotlin/expo/modules/plugin/ExpoRootProjectPlugin.kt'
  ),
  (src) =>
    src.replace(
      /versionCatalogs\.getVersionOrDefault\("kotlin"[^)]*\)/,
      '"2.1.0" /* patched: hardcoded for RN 0.76 compat */'
    )
);

// Patch 2: add enableBundleCompression back to ReactExtension as a no-op.
// RN 0.76 removed this property but Expo SDK 54's app/build.gradle still sets it.
patch(
  'ReactExtension.kt (enableBundleCompression)',
  path.join(
    ROOT,
    'node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/kotlin',
    'com/facebook/react/ReactExtension.kt'
  ),
  (src) => {
    if (src.includes('enableBundleCompression')) return src; // already present
    // Insert the no-op property after the opening of the abstract class body
    return src.replace(
      /(abstract\s+class\s+ReactExtension[^{]*\{)/,
      '$1\n  // Added by patchExpoKotlin: RN 0.76 removed this but SDK 54 template still sets it\n  @Suppress("unused") var enableBundleCompression: Boolean = false\n'
    );
  }
);
