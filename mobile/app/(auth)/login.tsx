import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../../src/stores/auth';
import { Button } from '../../src/components/ui/button';
import { colors } from '../../src/theme/colors';
import { type as typ, fonts } from '../../src/theme/typography';
import { spacing, radii } from '../../src/theme/tokens';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuth((s) => s.login);

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (e: any) {
      setError(e.response?.data?.error ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>Fleetops</Text>
        <Text style={styles.subtitle}>AR Technology — Fleet Management</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.ink4}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.ink4}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button title={loading ? 'Signing in...' : 'Sign in'} onPress={handleLogin} disabled={loading} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg0, justifyContent: 'center' },
  inner: { paddingHorizontal: spacing.screenH + 12, gap: 12 },
  title: { ...typ.display, color: colors.ink0, textAlign: 'center', marginBottom: 4 },
  subtitle: { ...typ.body, color: colors.ink3, textAlign: 'center', marginBottom: 24 },
  input: {
    height: 48,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    fontFamily: fonts.sans400,
    fontSize: 14,
    color: colors.ink0,
  },
  error: { color: colors.nogo, fontSize: 13, fontFamily: fonts.sans400 },
});
