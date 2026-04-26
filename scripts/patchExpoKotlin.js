#!/usr/bin/env node
/**
 * Patches ExpoRootProjectPlugin.kt to hardcode the Kotlin version used for KSP
 * resolution, bypassing the expoLibs version catalog.
 *
 * WHY: expo-root-project resolves kotlinVersion via:
 *   extra.setIfNotExist("kotlinVersion") { versionCatalogs.getVersionOrDefault("kotlin", ...) }
 * With React Native 0.76, the generated expoLibs catalog sets kotlin="1.9.24".
 * That version is absent from the KSP lookup map (only 2.x is supported), causing
 * the build to throw. Replacing the catalog lookup with a literal "2.1.0" fixes it.
 *
 * The Kotlin source is compiled by Gradle at build time, so patching it here
 * (during npm postinstall, before Gradle starts) takes effect correctly.
 */

const fs = require('fs');
const path = require('path');

const KOTLIN_VERSION = '2.1.0';

const PLUGIN_PATH = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-modules-autolinking',
  'android',
  'expo-gradle-plugin',
  'expo-autolinking-plugin',
  'src',
  'main',
  'kotlin',
  'expo',
  'modules',
  'plugin',
  'ExpoRootProjectPlugin.kt'
);

if (!fs.existsSync(PLUGIN_PATH)) {
  console.log('[patchExpoKotlin] ExpoRootProjectPlugin.kt not found — skipping');
  process.exit(0);
}

let content = fs.readFileSync(PLUGIN_PATH, 'utf8');

// Replace the version-catalog kotlinVersion lookup with a hardcoded value.
// Matches: versionCatalogs.getVersionOrDefault("kotlin", "<anything>")
const patched = content.replace(
  /versionCatalogs\.getVersionOrDefault\("kotlin"[^)]*\)/,
  `"${KOTLIN_VERSION}" /* patched: hardcoded for RN 0.76 compat */`
);

if (patched === content) {
  console.log('[patchExpoKotlin] Pattern not found — already patched or file changed');
} else {
  fs.writeFileSync(PLUGIN_PATH, patched);
  console.log(`[patchExpoKotlin] Patched kotlinVersion → ${KOTLIN_VERSION}`);
}
