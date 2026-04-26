import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { Link, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/useAuthStore';
import { theme } from '../../../constants/theme';

interface SignInForm {
  email: string;
  password: string;
}

export default function SignInScreen() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { session } = useAuthStore();

  // When session appears (login succeeded), navigate to map
  useEffect(() => {
    if (session) {
      router.replace('/(hidden)/map');
    }
  }, [session]);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInForm>({
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(data: SignInForm) {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    setLoading(false);

    if (error) {
      Alert.alert('Erro ao entrar', error.message);
    }
    // Navigation happens via the useEffect watching session
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Feather name="shield" size={36} color={theme.colors.primary} />
          </View>
          <Text style={styles.title}>Rede Guardião</Text>
          <Text style={styles.subtitle}>Acesso Restrito à Rede de Apoio</Text>
        </View>

        {/* Form */}
        <View style={styles.card}>
          <Text style={styles.label}>E-mail</Text>
          <Controller
            control={control}
            name="email"
            rules={{
              required: 'E-mail é obrigatório',
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'E-mail inválido',
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="seu@email.com"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {errors.email && (
            <Text style={styles.errorText}>{errors.email.message}</Text>
          )}

          <Text style={styles.label}>Senha</Text>
          <Controller
            control={control}
            name="password"
            rules={{
              required: 'Senha é obrigatória',
              minLength: { value: 6, message: 'Mínimo de 6 caracteres' },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.password && styles.inputError]}
                placeholder="Sua senha"
                placeholderTextColor={theme.colors.textMuted}
                secureTextEntry
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {errors.password && (
            <Text style={styles.errorText}>{errors.password.message}</Text>
          )}

          <TouchableOpacity
            disabled={loading}
            activeOpacity={0.8}
            onPress={handleSubmit(onSubmit)}
          >
            <LinearGradient colors={theme.colors.primaryGradient} style={styles.button}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Entrar</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Não tem uma conta?</Text>
          <Link href="/(hidden)/auth/sign-up" asChild>
            <TouchableOpacity>
              <Text style={styles.footerLink}> Criar conta</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.primary,
    marginTop: 6,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.glow,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginBottom: 6,
    marginTop: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: theme.colors.text,
  },
  inputError: {
    borderColor: theme.colors.danger,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 12,
    marginTop: 4,
  },
  button: {
    borderRadius: theme.borderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
  },
  footerText: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  footerLink: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
