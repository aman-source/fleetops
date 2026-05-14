import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  icon?: React.ReactNode;
}

export function Button({ title, onPress, variant = 'primary', disabled, icon }: ButtonProps) {
  const v = VARIANTS[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        v.container,
        pressed && { opacity: 0.85 },
        disabled && { opacity: 0.5 },
      ]}
    >
      {icon}
      <Text style={[styles.label, v.text]}>{title}</Text>
    </Pressable>
  );
}

const VARIANTS: Record<string, { container: ViewStyle; text: TextStyle }> = {
  primary: {
    container: { backgroundColor: colors.ink0 },
    text: { color: colors.white },
  },
  secondary: {
    container: { backgroundColor: colors.bg3, borderWidth: 1, borderColor: colors.line },
    text: { color: colors.ink0 },
  },
  danger: {
    container: { backgroundColor: colors.sos },
    text: { color: colors.white },
  },
  ghost: {
    container: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.line },
    text: { color: colors.ink0 },
  },
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 10,
    paddingHorizontal: 20,
    gap: 8,
  },
  label: { fontFamily: fonts.sans600, fontSize: 15 },
});
