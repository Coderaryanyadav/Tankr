class AnimatedValue {
  constructor(val) {
    this._val = val;
  }
  setValue(val) {
    this._val = val;
  }
  interpolate(config) {
    return this;
  }
}

const createMockAnim = () => ({
  start: (cb) => {
    if (cb) cb({ finished: true });
  },
  stop: () => {},
});

const Animated = {
  Value: AnimatedValue,
  timing: () => createMockAnim(),
  spring: () => createMockAnim(),
  sequence: () => createMockAnim(),
  parallel: () => createMockAnim(),
  loop: (anim) => anim || createMockAnim(),
  View: 'View',
  Text: 'Text',
};

const Easing = {
  linear: (t) => t,
  quad: (t) => t,
  inOut: (f) => f,
  out: (f) => f,
};

const AccessibilityInfo = {
  isReduceMotionEnabled: jest.fn().mockResolvedValue(false),
  addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
};

module.exports = {
  Platform: { OS: 'ios', select: (obj) => obj.ios || obj.default },
  Dimensions: { get: () => ({ width: 390, height: 844 }) },
  Alert: { alert: jest.fn() },
  Linking: { openURL: jest.fn() },
  StyleSheet: { create: (styles) => styles },
  Animated,
  Easing,
  AccessibilityInfo,
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  Modal: 'Modal',
  ActivityIndicator: 'ActivityIndicator',
};
