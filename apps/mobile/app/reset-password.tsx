import { useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { router } from 'expo-router';

import { resetPasswordInputSchema } from '@bemmecuida/domain';

import { AppText } from '@/components/AppText';
import { BrandHeader } from '@/components/BrandHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { Surface } from '@/components/Surface';
import { TextField } from '@/components/TextField';
import { supabase } from '@/services/supabase';
import { spacing } from '@/theme/tokens';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit() {
    const parsed = resetPasswordInputSchema.safeParse({ password, passwordConfirmation: confirmation });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])));
      return;
    }
    if (!supabase) return;

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    setLoading(false);
    if (error) {
      Alert.alert('Não foi possível alterar a senha', 'Abra novamente o link de recuperação ou solicite outro.');
      return;
    }
    Alert.alert('Senha atualizada', 'Seu acesso foi protegido com a nova senha.', [{ text: 'Continuar', onPress: () => router.replace('/') }]);
  }

  return (
    <Screen>
      <BrandHeader compact />
      <Surface style={styles.card}>
        <AppText variant="h1">Defina uma nova senha</AppText>
        <TextField label="Nova senha" value={password} onChangeText={setPassword} secureTextEntry textContentType="newPassword" hint="Use pelo menos 10 caracteres." error={errors.password} />
        <TextField label="Confirmar nova senha" value={confirmation} onChangeText={setConfirmation} secureTextEntry textContentType="newPassword" error={errors.passwordConfirmation} />
        <PrimaryButton label="Atualizar senha" onPress={() => void handleSubmit()} loading={loading} />
      </Surface>
    </Screen>
  );
}

const styles = StyleSheet.create({ card: { gap: spacing.lg } });
