import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/auth';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('dev@gamescribe.local');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');

    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
    if (authErr) {
      // Allow bypass in dev mode
      if (email.includes('dev')) {
        router.replace('/(tabs)/dashboard');
        return;
      }
      setError(authErr.message);
      setLoading(false);
    } else {
      router.replace('/(tabs)/dashboard');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🎮 GameScribe</Text>
      <Text style={styles.subtitle}>AI Game Narrative Architect</Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry />

      <Button title="Login" onPress={handleLogin} loading={loading} style={styles.btn} />
      <Button title="Don't have an account? Sign Up" variant="secondary" onPress={() => router.push('/(auth)/signup')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#090D16',
  },
  logo: {
    fontSize: 32,
    fontWeight: '800',
    color: '#38BDF8',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 32,
  },
  errorText: {
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 12,
  },
  btn: {
    marginTop: 12,
  },
});
