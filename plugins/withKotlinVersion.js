const { withProjectBuildGradle } = require('@expo/config-plugins');

const KOTLIN_VERSION = '2.1.0';
// Must match KSPLookup in expo-modules-autolinking for the chosen Kotlin version.
const KSP_VERSION = '2.1.0-1.0.29';

module.exports = function withKotlinVersion(config) {
  // expo-root-project (expo-modules-autolinking) resolves kotlinVersion via:
  //   extra.setIfNotExist("kotlinVersion") { versionCatalogs.getVersionOrDefault("kotlin", ...) }
  // With RN 0.76, the generated expoLibs catalog contains kotlin="1.9.24", which is
  // absent from the KSP lookup map (only 2.x is supported) and causes a build failure.
  // Pre-populating both ext properties at the top of build.gradle causes setIfNotExist
  // to return our values immediately, bypassing the catalog lookup and the KSP lookup.
  return withProjectBuildGradle(config, (config) => {
    let contents = config.modResults.contents;
    if (!contents.includes('ext.kotlinVersion')) {
      contents =
        `ext.kotlinVersion = "${KOTLIN_VERSION}"\n` +
        `ext.kspVersion = "${KSP_VERSION}"\n` +
        contents;
    }
    config.modResults.contents = contents;
    return config;
  });
  // enableBundleCompression is handled by scripts/patchExpoKotlin.js (Patch 2),
  // which adds the no-op property back to ReactExtension.kt at postinstall time.
};
