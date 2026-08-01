// ⌨️ Klavye dostu ScrollView
// Kaydırınca / dışarı tıklayınca / butona tıklayınca klavye kapanır

import React from 'react';
import {
  ScrollView,
  ScrollViewProps,
  Keyboard,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';

interface KeyboardAwareScrollViewProps extends ScrollViewProps {
  /** İçeriğin altında "klavyeyi kapat" için tıklanabilir boş alan göster (varsayılan: true) */
  showDismissArea?: boolean;
  /** Boş alan minimum yükseklik (px) */
  dismissAreaMinHeight?: number;
}

const KeyboardAwareScrollView: React.FC<KeyboardAwareScrollViewProps> = ({
  children,
  showDismissArea = true,
  dismissAreaMinHeight = 120,
  keyboardDismissMode = 'on-drag',
  keyboardShouldPersistTaps = 'handled',
  ...rest
}) => {
  return (
    <ScrollView
      keyboardDismissMode={keyboardDismissMode}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      showsVerticalScrollIndicator={false}
      {...rest}
    >
      {children}
      {showDismissArea && (
        <Pressable
          style={[styles.dismissArea, { minHeight: dismissAreaMinHeight }]}
          onPress={() => Keyboard.dismiss()}
          accessible
          accessibilityLabel="Klavyeyi kapat"
          accessibilityRole="button"
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  dismissArea: {
    width: '100%',
    ...(Platform.OS === 'android' && { minHeight: 80 }),
  },
});

export default KeyboardAwareScrollView;
