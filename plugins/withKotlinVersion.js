const { withProjectBuildGradle, withAppBuildGradle } = require('@expo/config-plugins');

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
  config = withProjectBuildGradle(config, (cfg) => {
    let contents = cfg.modResults.contents;
    if (!contents.includes('ext.kotlinVersion')) {
      contents =
        `ext.kotlinVersion = "${KOTLIN_VERSION}"\n` +
        `ext.kspVersion = "${KSP_VERSION}"\n` +
        contents;
    }
    cfg.modResults.contents = contents;
    return cfg;
  });

  // RN 0.76 removed enableBundleCompression from ReactExtension but Expo SDK 54's
  // app/build.gradle template still sets it, causing "unknown property" at build time.
  config = withAppBuildGradle(config, (cfg) => {
    cfg.modResults.contents = cfg.modResults.contents.replace(
      /[ \t]*enableBundleCompression\s*=\s*\S+[ \t]*\n?/g,
      ''
    );
    return cfg;
  });

  return config;
};
