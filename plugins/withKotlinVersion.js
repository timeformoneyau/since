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
  // app/build.gradle template still generates a `react { enableBundleCompression = false }`
  // block. We replace it with a correct minimal block that sets bundleCommand to
  // "export:embed" (the Expo CLI bundler). Without this, BundleHermesCTask falls back to
  // `react-native bundle` which requires @react-native-community/cli — not installed in
  // Expo managed workflow. Use a line-by-line brace counter to safely remove the old block
  // (regex with \s* spans newlines and can corrupt unrelated file content).
  config = withAppBuildGradle(config, (cfg) => {
    const lines = cfg.modResults.contents.split('\n');
    const output = [];
    let inBlock = false;
    let depth = 0;

    for (const line of lines) {
      if (!inBlock && /^\s*react\s*\{/.test(line)) {
        inBlock = true;
        depth = (line.split('{').length - 1) - (line.split('}').length - 1);
        if (depth <= 0) inBlock = false;
        continue;
      }
      if (inBlock) {
        depth += (line.split('{').length - 1) - (line.split('}').length - 1);
        if (depth <= 0) inBlock = false;
        continue;
      }
      output.push(line);
    }

    cfg.modResults.contents = output.join('\n');
    return cfg;
  });

  return config;
};
