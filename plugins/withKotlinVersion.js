const { withProjectBuildGradle, withGradleProperties } = require('@expo/config-plugins');

const KOTLIN_VERSION = '2.1.0';

/**
 * Sets kotlinVersion in both gradle.properties and build.gradle.
 *
 * gradle.properties is read before build.gradle evaluation, so setting it
 * there ensures expo-root-project (expo-modules-core settings plugin) sees
 * Kotlin 2.x when it looks up the matching KSP version.
 */
module.exports = function withKotlinVersion(config) {
  // 1. Set in android/gradle.properties (read earliest, before settings plugins)
  config = withGradleProperties(config, (config) => {
    config.modResults = config.modResults.filter(
      (item) => !(item.type === 'property' && item.key === 'kotlinVersion')
    );
    config.modResults.push({
      type: 'property',
      key: 'kotlinVersion',
      value: KOTLIN_VERSION,
    });
    return config;
  });

  // 2. Also replace in android/build.gradle ext block for the classpath declaration
  config = withProjectBuildGradle(config, (config) => {
    config.modResults.contents = config.modResults.contents.replace(
      /kotlinVersion\s*=\s*["'][\d.]+["']/,
      `kotlinVersion = "${KOTLIN_VERSION}"`
    );
    return config;
  });

  return config;
};
