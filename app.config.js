/** @type {import('expo/config').ExpoConfig} */
const appJson = require('./app.json');

const baseUrl = process.env.EXPO_BASE_URL ?? '';

module.exports = {
  ...appJson,
  expo: {
    ...appJson.expo,
    experiments: {
      ...appJson.expo.experiments,
      ...(baseUrl ? { baseUrl } : {}),
    },
  },
};
