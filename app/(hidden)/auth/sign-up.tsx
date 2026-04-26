import React, { useState } from 'react';
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
  ScrollView,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { Link, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { supabase } from '../../../lib/supabase';
import { theme } from '../../../constants/theme';
import { useAuthStore } from '../../../store/useAuthStore';

interface SignUpForm {
  fullName: string;
  username: string;
  email: string;
  password: string;
}

export default function SignUpWizard() {
  const router = useRouter();
  const { setProfile } = useAuthStore();
  
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);

  // Step 2 & 3 state
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [cpf, setCpf] = useState('');

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<SignUpForm>({
    defaultValues: { fullName: '', username: '', email: '', password: '' },
  });

  // Step 1: Create Account
  async function onStep1Submit(data: SignUpForm) {
    setLoading(true);
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
        },
      },
    });
    setLoading(false);

    if (error) {
      Alert.alert('Erro ao criar conta', error.message);
      return;
    }
    
    if (authData?.user) {
      setCreatedUserId(authData.user.id);
      
      // Wait a moment for the DB trigger to create the profile row
      await new Promise(r => setTimeout(r, 500));
      
      setStep(2); // Proceed to biometrics
    }
  }

  // Step 2: Biometrics Simulator
  function handleSimulateScan() {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      setScanned(true);
      setTimeout(() => setStep(3), 800);
    }, 2500);
  }

  // Step 3: CPF and finalize
  async function handleCompleteValidation() {
    const rawCpf = cpf.replace(/\D/g, '');
    if (rawCpf.length < 11) {
      Alert.alert('CPF Inválido', 'O CPF deve conter 11 dígitos numéricos.');
      return;
    }
    if (!createdUserId) {
      Alert.alert('Erro', 'ID de usuário não encontrado. Tente criar a conta novamente.');
      return;
    }

    setLoading(true);
    
    const username = getValues('username');
    
    // Use RPC to bypass RLS timing issues during sign-up flow
    const { data: result, error } = await supabase.rpc('complete_kyc', {
      p_user_id: createdUserId,
      p_cpf: rawCpf,
      p_username: username || null,
    });

    setLoading(false);

    if (error) {
      Alert.alert('Falha na validação', error.message);
      return;
    }
    
    if (result && result.success) {
      setProfile(result.profile);
      Alert.alert(
        'Bem-vinda!', 
        'Sua identidade foi confirmada. Você agora faz parte da rede de apoio.',
        [{ text: 'Continuar', onPress: () => router.replace('/(hidden)/map') }]
      );
    } else {
      Alert.alert('Erro', result?.error || 'Erro desconhecido ao completar validação.');
    }
  }

  // Step indicator
  const StepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map((s) => (
        <View key={s} style={styles.stepRow}>
          <View style={[
            styles.stepDot, 
            s <= step && styles.stepDotActive,
            s < step && styles.stepDotDone,
          ]}>
            {s < step ? (
              <Feather name="check" size={12} color="#FFF" />
            ) : (
              <Text style={[styles.stepNum, s <= step && styles.stepNumActive]}>{s}</Text>
            )}
          </View>
          {s < 3 && <View style={[styles.stepLine, s < step && styles.stepLineActive]} />}
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.backgroundAccent} />
      <View style={styles.backgroundAccent2} />
      
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoWrap}>
              <Feather name="shield" size={36} color={theme.colors.primary} />
            </View>
            <Text style={styles.title}>Rede Guardião</Text>
            <Text style={styles.subtitle}>CADASTRO RESTRITO</Text>
          </View>

          <StepIndicator />

          {/* STEP 1: Account Creation */}
          {step === 1 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Feather name="user-plus" size={20} color={theme.colors.primary} />
                <Text style={styles.cardTitle}>Dados da Conta</Text>
              </View>
              <Text style={styles.cardText}>
                Preencha seus dados para criar sua identidade na rede.
              </Text>
               
              <Text style={styles.label}>Nome Completo</Text>
              <Controller
                control={control}
                name="fullName"
                rules={{ required: 'Nome é obrigatório' }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors.fullName && styles.inputError]}
                    placeholder="Maria da Silva"
                    placeholderTextColor={theme.colors.textMuted}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              {errors.fullName && <Text style={styles.errorText}>{errors.fullName.message}</Text>}

              <Text style={styles.label}>Nome de Usuária</Text>
              <Controller
                control={control}
                name="username"
                rules={{ 
                  required: 'Nome de usuária é obrigatório',
                  minLength: { value: 3, message: 'Mínimo 3 caracteres' },
                  pattern: {
                    value: /^[a-z0-9_]+$/,
                    message: 'Use apenas letras minúsculas, números e _'
                  }
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={styles.usernameInputWrap}>
                    <Text style={styles.usernameAt}>@</Text>
                    <TextInput
                      style={[styles.usernameInput, errors.username && styles.inputError]}
                      placeholder="maria_silva"
                      placeholderTextColor={theme.colors.textMuted}
                      autoCapitalize="none"
                      autoCorrect={false}
                      onBlur={onBlur}
                      onChangeText={(text) => onChange(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      value={value}
                    />
                  </View>
                )}
              />
              {errors.username && <Text style={styles.errorText}>{errors.username.message}</Text>}

              <Text style={styles.label}>E-mail</Text>
              <Controller
                control={control}
                name="email"
                rules={{ 
                  required: 'E-mail é obrigatório',
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'E-mail inválido' }
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors.email && styles.inputError]}
                    placeholder="seu@email.com"
                    placeholderTextColor={theme.colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}

              <Text style={styles.label}>Senha</Text>
              <Controller
                control={control}
                name="password"
                rules={{ required: 'Senha é obrigatória', minLength: { value: 6, message: 'Mínimo 6 caracteres' } }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors.password && styles.inputError]}
                    placeholder="Mínimo 6 caracteres"
                    placeholderTextColor={theme.colors.textMuted}
                    secureTextEntry
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}

              <TouchableOpacity 
                onPress={handleSubmit(onStep1Submit)} 
                disabled={loading}
                activeOpacity={0.8}
              >
                <LinearGradient colors={theme.colors.primaryGradient} style={styles.actionButton}>
                  {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.actionButtonText}>Criar Conta e Continuar</Text>}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Já tem conta?</Text>
                <Link href="/(hidden)/auth/sign-in" asChild>
                  <TouchableOpacity><Text style={styles.footerLink}> Entrar</Text></TouchableOpacity>
                </Link>
              </View>
            </View>
          )}

          {/* STEP 2: Biometrics */}
          {step === 2 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Feather name="camera" size={20} color={theme.colors.primary} />
                <Text style={styles.cardTitle}>Verificação Biométrica</Text>
              </View>
              <Text style={styles.cardText}>
                Para proteger a rede contra intrusos, precisamos confirmar sua identidade através de verificação facial.
              </Text>

              <View style={styles.scanBox}>
                {scanning ? (
                  <View style={styles.scanningWrap}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={styles.scanningText}>Analisando padrões faciais...</Text>
                  </View>
                ) : scanned ? (
                   <View style={styles.scanningWrap}>
                     <View style={styles.checkCircle}>
                       <Feather name="check" size={32} color="#FFF" />
                     </View>
                     <Text style={[styles.scanningText, { color: '#10B981' }]}>Verificação concluída!</Text>
                   </View>
                ) : (
                  <View style={styles.scanningWrap}>
                    <View style={styles.scanFrame}>
                      <View style={[styles.scanCorner, styles.scanCornerTL]} />
                      <View style={[styles.scanCorner, styles.scanCornerTR]} />
                      <View style={[styles.scanCorner, styles.scanCornerBL]} />
                      <View style={[styles.scanCorner, styles.scanCornerBR]} />
                      <Feather name="user" size={48} color={theme.colors.textMuted} />
                    </View>
                    <Text style={styles.scanHintText}>Posicione seu rosto no centro</Text>
                  </View>
                )}
              </View>

              {!scanned && (
                <TouchableOpacity onPress={handleSimulateScan} disabled={scanning} activeOpacity={0.8}>
                   <LinearGradient colors={theme.colors.primaryGradient} style={styles.actionButton}>
                     <Feather name="camera" size={18} color="#FFF" style={{ marginRight: 8 }} />
                     <Text style={styles.actionButtonText}>Iniciar Verificação</Text>
                   </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* STEP 3: CPF */}
          {step === 3 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Feather name="file-text" size={20} color={theme.colors.primary} />
                <Text style={styles.cardTitle}>Documento de Identidade</Text>
              </View>
              <Text style={styles.cardText}>
                Último passo! Informe seu CPF para completar a validação e entrar na rede de apoio.
              </Text>

              <Text style={styles.label}>CPF</Text>
              <TextInput
                style={styles.cpfInput}
                placeholder="000.000.000-00"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="number-pad"
                value={cpf}
                onChangeText={setCpf}
                maxLength={14}
              />

              <TouchableOpacity onPress={handleCompleteValidation} disabled={loading} activeOpacity={0.8}>
                 <LinearGradient colors={theme.colors.primaryGradient} style={styles.actionButton}>
                   {loading ? (
                     <ActivityIndicator color="#FFF" />
                   ) : (
                     <>
                       <Feather name="check-circle" size={18} color="#FFF" style={{ marginRight: 8 }} />
                       <Text style={styles.actionButtonText}>Finalizar Cadastro</Text>
                     </>
                   )}
                 </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  backgroundAccent: { position: 'absolute', top: -120, right: -80, width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(139, 92, 246, 0.08)' },
  backgroundAccent2: { position: 'absolute', bottom: -60, left: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(139, 92, 246, 0.05)' },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: theme.spacing.lg, paddingVertical: 40 },
  
  header: { alignItems: 'center', marginBottom: 24 },
  logoWrap: { 
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 2, borderColor: 'rgba(139, 92, 246, 0.3)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  title: { fontSize: 26, fontWeight: '800', color: theme.colors.text, textAlign: 'center', letterSpacing: -0.5 },
  subtitle: { fontSize: 11, color: theme.colors.primary, fontWeight: '700', letterSpacing: 2, marginTop: 4 },

  // Step indicator
  stepIndicator: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  stepRow: { flexDirection: 'row', alignItems: 'center' },
  stepDot: { 
    width: 28, height: 28, borderRadius: 14, 
    backgroundColor: theme.colors.surface, borderWidth: 2, borderColor: theme.colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  stepDotActive: { borderColor: theme.colors.primary },
  stepDotDone: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  stepNum: { fontSize: 12, fontWeight: '700', color: theme.colors.textMuted },
  stepNumActive: { color: theme.colors.primary },
  stepLine: { width: 40, height: 2, backgroundColor: theme.colors.border, marginHorizontal: 4 },
  stepLineActive: { backgroundColor: theme.colors.primary },

  // Card
  card: { 
    backgroundColor: theme.colors.surface, padding: 24, 
    borderRadius: theme.borderRadius.xl, borderWidth: 1, borderColor: theme.colors.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text, marginLeft: 10 },
  cardText: { fontSize: 14, color: theme.colors.textMuted, lineHeight: 22, marginBottom: 20 },

  // Inputs
  label: { fontSize: 12, fontWeight: '700', color: theme.colors.textMuted, marginBottom: 6, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  input: { 
    backgroundColor: 'rgba(0,0,0,0.15)', borderWidth: 1, borderColor: theme.colors.border, 
    borderRadius: theme.borderRadius.md, paddingHorizontal: 16, paddingVertical: 13, 
    fontSize: 16, color: theme.colors.text,
  },
  inputError: { borderColor: theme.colors.danger },
  errorText: { color: theme.colors.danger, fontSize: 12, marginTop: 4 },

  // Username with @
  usernameInputWrap: { flexDirection: 'row', alignItems: 'center' },
  usernameAt: { 
    fontSize: 18, fontWeight: '700', color: theme.colors.primary, 
    paddingRight: 4, paddingLeft: 2,
  },
  usernameInput: { 
    flex: 1, backgroundColor: 'rgba(0,0,0,0.15)', borderWidth: 1, borderColor: theme.colors.border, 
    borderRadius: theme.borderRadius.md, paddingHorizontal: 14, paddingVertical: 13, 
    fontSize: 16, color: theme.colors.text,
  },

  // CPF
  cpfInput: { 
    backgroundColor: 'rgba(0,0,0,0.15)', borderWidth: 1, borderColor: theme.colors.border, 
    borderRadius: theme.borderRadius.md, padding: 16, 
    fontSize: 20, color: theme.colors.text, textAlign: 'center', letterSpacing: 2,
  },

  // Buttons
  actionButton: { 
    borderRadius: theme.borderRadius.lg, paddingVertical: 16, 
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', marginTop: 24,
  },
  actionButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  // Scan
  scanBox: { 
    height: 220, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: theme.borderRadius.lg, 
    borderWidth: 1, borderColor: theme.colors.border, 
    justifyContent: 'center', alignItems: 'center', marginBottom: 16, overflow: 'hidden',
  },
  scanningWrap: { alignItems: 'center' },
  scanningText: { color: theme.colors.primary, marginTop: 16, fontWeight: '600', fontSize: 14 },
  checkCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center' },
  scanFrame: { 
    width: 120, height: 120, justifyContent: 'center', alignItems: 'center',
  },
  scanCorner: { position: 'absolute', width: 20, height: 20, borderColor: theme.colors.primary },
  scanCornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
  scanCornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
  scanCornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
  scanCornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
  scanHintText: { color: theme.colors.textMuted, fontSize: 13, marginTop: 12 },

  // Footer
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText: { color: theme.colors.textMuted, fontSize: 14 },
  footerLink: { color: theme.colors.primary, fontSize: 14, fontWeight: '600' },
});
