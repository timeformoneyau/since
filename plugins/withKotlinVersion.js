const { withProjectBuildGradle, withGradleProperties } = require('@expo/config-plugins');

const KOTLIN_VERSION = '2.1.0';

module.exports = function withKotlinVersion(config) {
  // 1. android/gradle.properties — read by Gradle before any build scripts
  config = withGradleProperties(config, (config) => {
    config.modResults = config.modResults.filter(
      (item) => !(item.type === 'property' && item.key === 'kotlinVersion')
    );
    config.modResults.push({ type: 'property', key: 'kotlinVersion', value: KOTLIN_VERSION });
    return config;
  });

  // 2. android/build.gradle — three strategies to ensure Kotlin 2.x is used
  config = withProjectBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    // Strategy A: Replace kotlinVersion in the ext block (handles "X.Y.Z" and 'X.Y.Z')
    contents = contents.replace(
      /kotlinVersion\s*=\s*["'][\d.]+["']/,
      `kotlinVersion = "${KOTLIN_VERSION}"`
    );

    // Strategy B: Inject ext override immediately before expo-root-project is applied.
    // This fires regardless of how the plugin reads kotlinVersion (ext, classpath, etc.).
    contents = contents.replace(
      /(\bapply\s+plugin\s*:\s*['"]expo-root-project['"])/,
      `ext.kotlinVersion = "${KOTLIN_VERSION}"\n$1`
    );

    // Strategy C: Hardcode the kotlin-gradle-plugin classpath so the JVM classpath
    // version also matches (catches the case where expo-root-project reads
    // KotlinCompilerVersion.VERSION from the stdlib jar rather than ext properties).
    contents = contents.replace(
      /org\.jetbrains\.kotlin:kotlin-gradle-plugin:[^"'\s)]+/,
      `org.jetbrains.kotlin:kotlin-gradle-plugin:${KOTLIN_VERSION}`
    );

    config.modResults.contents = contents;
    return config;
  });

  return config;
};
