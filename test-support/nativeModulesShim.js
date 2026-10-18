// jest-expo 54 expects React Native 0.81, where NativeModules has a `default`
// export. This app is on RN 0.76 (CommonJS), so add the alias for tests only.
const NativeModules = require('react-native/Libraries/BatchedBridge/NativeModules.js');
NativeModules.default = NativeModules;
module.exports = NativeModules;
