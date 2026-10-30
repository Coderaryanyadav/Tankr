import React, { useEffect, useRef } from 'react';
import {
  Animated,
  DimensionValue,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { borderRadius } from '../../../theme/borderRadius';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  radius = borderRadius.md,
  style,
}) => {
  const opacityAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.85,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.35,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [opacityAnim]);

  return (
    <Animated.View
      style={[
        styles.skeletonBase,
        {
          width,
          height,
          borderRadius: radius,
          opacity: opacityAnim,
        },
        style,
      ]}
    />
  );
};

/** Pre-built Tanker Card Skeleton */
export const TankerCardSkeleton: React.FC = () => {
  return (
    <View style={styles.cardSkeletonWrapper}>
      <Skeleton width={52} height={52} radius={borderRadius.xl} style={{ marginRight: spacing.md }} />
      <View style={{ flex: 1 }}>
        <Skeleton width="60%" height={16} radius={borderRadius.sm} style={{ marginBottom: 6 }} />
        <Skeleton width="40%" height={12} radius={borderRadius.sm} style={{ marginBottom: 6 }} />
        <Skeleton width="50%" height={10} radius={borderRadius.sm} />
      </View>
      <View style={{ alignItems: 'flex-end', marginLeft: spacing.sm }}>
        <Skeleton width={60} height={20} radius={borderRadius.sm} style={{ marginBottom: 4 }} />
        <Skeleton width={35} height={10} radius={borderRadius.sm} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  skeletonBase: {
    backgroundColor: colors.shimmerBase,
  },
  cardSkeletonWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.cardSurface,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    marginVertical: spacing.xs,
  },
});

