// 🖼️ LAZY IMAGE COMPONENT
// Image lazy loading with placeholder and progressive loading
// Optimizes memory usage and improves scroll performance

import React, { useState, useEffect, useRef } from 'react';
import { Image, ImageProps, View, ActivityIndicator, StyleSheet, Animated } from 'react-native';
import { COLORS } from '../../constants';

interface LazyImageProps extends ImageProps {
  source: { uri: string } | number;
  placeholder?: React.ReactNode;
  style?: any;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center' | 'repeat';
  showLoadingIndicator?: boolean;
  fadeInDuration?: number;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: (error: any) => void;
}

const LazyImage: React.FC<LazyImageProps> = ({
  source,
  placeholder,
  style,
  resizeMode = 'cover',
  showLoadingIndicator = true,
  fadeInDuration = 200,
  onLoadStart,
  onLoadEnd,
  onError,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isLoaded) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: fadeInDuration,
        useNativeDriver: true,
      }).start();
    }
  }, [isLoaded, fadeAnim, fadeInDuration]);

  const handleLoadStart = () => {
    setIsLoading(true);
    setHasError(false);
    onLoadStart?.();
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
    setIsLoaded(true);
    onLoadEnd?.();
  };

  const handleError = (error: any) => {
    setIsLoading(false);
    setHasError(true);
    onError?.(error);
  };

  const defaultPlaceholder = (
    <View style={[styles.placeholder, style]}>
      {showLoadingIndicator && <ActivityIndicator size="small" color={COLORS.gray[400]} />}
    </View>
  );

  return (
    <View style={[styles.container, style]}>
      {!isLoaded && !hasError && (placeholder || defaultPlaceholder)}
      {hasError && (
        <View style={[styles.errorPlaceholder, style]}>
          <View style={styles.errorIcon}>
            {/* Image error icon */}
          </View>
        </View>
      )}
      <Animated.View
        style={[
          styles.imageContainer,
          { opacity: isLoaded ? fadeAnim : 0 },
          style,
        ]}
        pointerEvents="none"
      >
        <Image
          source={source}
          style={[styles.image, style]}
          resizeMode={resizeMode}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          onError={handleError}
          {...props}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  placeholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.gray[300],
  },
  imageContainer: {
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

export default LazyImage;
