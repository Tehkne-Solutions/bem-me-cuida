import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { Surface } from '@/components/Surface';
import { colors, radius, spacing } from '@/theme/tokens';

const contacts = [
  { label: 'CVV — apoio emocional', detail: '188 · atendimento gratuito', phone: '188' },
  { label: 'SAMU — emergência médica', detail: '192', phone: '192' },
];

export default function CrisisScreen() {
  return (
    <Screen>
      <Pressable onPress={() => router.back()} accessibilityRole="button">
        <AppText variant="bodyStrong">← Voltar</AppText>
      </Pressable>

      <View style={styles.hero}>
        <AppText style={styles.icon}>🤝</AppText>
        <AppText variant="h1" testID="crisis-title" style={styles.center}>Você não precisa atravessar este momento sozinho.</AppText>
        <AppText muted style={styles.center}>Este espaço organiza caminhos de apoio. Em risco imediato, procure um local seguro e um serviço de emergência.</AppText>
      </View>

      <Surface style={styles.section}>
        <AppText variant="h2">Você está em segurança agora?</AppText>
        <AppText muted>Se a resposta for não, ligue para a emergência ou peça para alguém permanecer com você.</AppText>
        <PrimaryButton testID="crisis-call-samu" label="Ligar para o SAMU 192" tone="danger" onPress={() => void Linking.openURL('tel:192')} />
      </Surface>

      <AppText variant="h2" style={styles.title}>Contatos de apoio</AppText>
      <View style={styles.list}>
        {contacts.map((contact) => (
          <Pressable
            key={contact.phone}
            accessibilityRole="button"
            onPress={() => void Linking.openURL(`tel:${contact.phone}`)}
            style={styles.contact}
          >
            <View style={styles.flex}>
              <AppText variant="bodyStrong">{contact.label}</AppText>
              <AppText variant="caption" muted>{contact.detail}</AppText>
            </View>
            <AppText variant="bodyStrong" style={styles.call}>Ligar</AppText>
          </Pressable>
        ))}
      </View>

      <Surface style={styles.section}>
        <AppText variant="h2">Enquanto o apoio chega</AppText>
        <AppText muted>Olhe ao redor e nomeie 5 coisas que vê, 4 que pode tocar, 3 que escuta, 2 que sente pelo olfato e 1 gosto. Isso não substitui ajuda, mas pode ajudar a atravessar os próximos minutos.</AppText>
      </Surface>

      <AppText variant="caption" muted style={styles.disclaimer}>O BemMeCuida não é um serviço de emergência. Tehkné Solutions.</AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  icon: { fontSize: 52 },
  center: { textAlign: 'center' },
  section: { gap: spacing.md, marginBottom: spacing.lg },
  title: { marginBottom: spacing.md },
  list: { gap: spacing.sm, marginBottom: spacing.lg },
  contact: { flexDirection: 'row', alignItems: 'center', minHeight: 68, padding: spacing.lg, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  flex: { flex: 1, gap: spacing.xs },
  call: { color: colors.primaryStrong },
  disclaimer: { textAlign: 'center', marginVertical: spacing.xl },
});
