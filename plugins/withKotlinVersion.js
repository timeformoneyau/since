const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const KOTLIN_VERSION = '2.1.0';

module.exports = function withKotlinVersion(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const root = config.modRequest.platformProjectRoot;

      // --- android/build.gradle ---
      // The SDK 54 template has NO ext { kotlinVersion } block.
      // expo-root-project defaults to "1.9.24" when the property is absent.
      // The classpath entry is also unversioned; React Native's transitive
      // dependency resolves it to 1.9.24.
      const buildGradlePath = path.join(root, 'build.gradle');
      let buildGradle = fs.readFileSync(buildGradlePath, 'utf8');

      // Fix 1: inject ext.kotlinVersion right before expo-root-project is applied
      buildGradle = buildGradle.replace(
        /(\bapply\s+plugin\s*:\s*["']expo-root-project["'])/,
        `ext.kotlinVersion = "${KOTLIN_VERSION}"\n$1`
      );

      // Fix 2: add explicit version to the unversioned kotlin-gradle-plugin
      // classpath so the actual Kotlin compiler used is also 2.x
      buildGradle = buildGradle.replace(
        /org\.jetbrains\.kotlin:kotlin-gradle-plugin(["')])/g,
        `org.jetbrains.kotlin:kotlin-gradle-plugin:${KOTLIN_VERSION}$1`
      );

      fs.writeFileSync(buildGradlePath, buildGradle);

      // --- android/gradle.properties ---
      const propsPath = path.join(root, 'gradle.properties');
      let props = fs.readFileSync(propsPath, 'utf8');
      props = props.replace(/^\s*kotlinVersion\s*=.*$/m, '');
      props += `\nkotlinVersion=${KOTLIN_VERSION}\n`;
      fs.writeFileSync(propsPath, props);

      return config;
    },
  ]);
};
