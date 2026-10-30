import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius } from '../../../theme/borderRadius';
import { colors } from '../../../theme/colors';
import { shadows } from '../../../theme/shadows';
import { spacing } from '../../../theme/spacing';
import { fontSizes, fontWeights } from '../../../theme/typography';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  maxHeight?: number;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
  maxHeight = SCREEN_HEIGHT * 0.75,
}) => {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          damping: 24,
          mass: 0.9,
          stiffness: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, backdropOpacity, translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 0.8) {
          onClose();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            bounciness: 4,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Dim Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={styles.backdropPressable} onPress={onClose} />
        </Animated.View>

        {/* Sheet Surface */}
        <Animated.View
          style={[
            styles.sheetContainer,
            { maxHeight, transform: [{ translateY }] },
          ]}
        >
          {/* Pan drag bar */}
          <View {...panResponder.panHandlers} style={styles.dragBarArea}>
            <View style={styles.dragHandle} />
          </View>

          {/* Header */}
          {(title || subtitle) && (
            <View style={styles.header}>
              <View style={styles.titleCol}>
                {title && <Text style={styles.title}>{title}</Text>}
                {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close bottom sheet"
                onPress={onClose}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>
          )}

          {/* Sheet Body Content */}
          <View style={styles.contentBody}>{children}</View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
  },
  backdropPressable: {
    flex: 1,
  },
  sheetContainer: {
    width: '100%',
    backgroundColor: colors.cardSurface,
    borderTopLeftRadius: borderRadius['3xl'],
    borderTopRightRadius: borderRadius['3xl'],
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingBottom: 34, // Safe area bottom pad
    ...shadows.modal,
  },
  dragBarArea: {
    width: '100%',
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: borderRadius.full,
    backgroundColor: colors.cardBorder,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  titleCol: {
    flex: 1,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.darkNavy,
  },
  subtitle: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentBody: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
  },
});
