module.exports = {
  Platform: { OS: 'ios', select: (obj) => obj.ios || obj.default },
  Dimensions: { get: () => ({ width: 390, height: 844 }) },
  Alert: { alert: jest.fn() },
  Linking: { openURL: jest.fn() },
  StyleSheet: { create: (styles) => styles },
};
