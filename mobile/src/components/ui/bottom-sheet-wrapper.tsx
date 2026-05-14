import React, { forwardRef } from 'react';
import { StyleSheet } from 'react-native';
import GorhomBottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { colors } from '../../theme/colors';

interface BottomSheetWrapperProps {
  snapPoints: (string | number)[];
  children: React.ReactNode;
}

export const BottomSheetWrapper = forwardRef<GorhomBottomSheet, BottomSheetWrapperProps>(
  ({ snapPoints, children }, ref) => {
    return (
      <GorhomBottomSheet
        ref={ref}
        snapPoints={snapPoints}
        handleIndicatorStyle={styles.handle}
        backgroundStyle={styles.bg}
      >
        <BottomSheetView style={styles.content}>
          {children}
        </BottomSheetView>
      </GorhomBottomSheet>
    );
  }
);

const styles = StyleSheet.create({
  handle: { width: 36, height: 4, backgroundColor: colors.lineStrong, borderRadius: 2 },
  bg: { backgroundColor: colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  content: { padding: 14 },
});
