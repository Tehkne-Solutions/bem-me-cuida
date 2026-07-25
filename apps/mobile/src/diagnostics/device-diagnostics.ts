import * as Crypto from 'expo-crypto';
import * as Network from 'expo-network';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { publicEnvironment } from '@/config/environment';
import { getDatabase } from '@/data/database';
import { getLocalSyncState } from '@/data/sync-state-repository';
import { supabase } from '@/services/supabase';
import type { DiagnosticItem, DiagnosticReport } from '@/diagnostics/report';

const EXPECTED_LOCAL_SCHEMA = 7;

async function checkDatabase(): Promise<DiagnosticItem> {
  try {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ version: number | null }>(
      'SELECT MAX(version) AS version FROM schema_migrations;',
    );
    const version = Number(row?.version ?? 0);
    if (version < EXPECTED_LOCAL_SCHEMA) {
      return { id: 'database', label: 'Banco local criptografado', status: 'error', detail: `Schema ${version}; esperado ${EXPECTED_LOCAL_SCHEMA}.` };
    }

    const cipherRow = await db.getFirstAsync<Record<string, string>>('PRAGMA cipher_version;');
    const cipherVersion = cipherRow ? Object.values(cipherRow)[0] : null;
    if (Platform.OS !== 'web' && !cipherVersion) {
      return { id: 'database', label: 'Banco local criptografado', status: 'error', detail: `Schema ${version}, mas SQLCipher não foi detectado neste build.` };
    }

    return {
      id: 'database',
      label: 'Banco local criptografado',
      status: Platform.OS === 'web' ? 'warning' : 'ok',
      detail: Platform.OS === 'web'
        ? `Schema ${version}; criptografia nativa deve ser validada no Android/iOS.`
        : `Schema ${version}; SQLCipher ${cipherVersion} ativo.`,
    };
  } catch {
    return { id: 'database', label: 'Banco local criptografado', status: 'error', detail: 'Não foi possível abrir ou migrar o banco.' };
  }
}

async function checkSecureStore(): Promise<DiagnosticItem> {
  const key = `bemmecuida.diagnostic.${Crypto.randomUUID()}`;
  try {
    await SecureStore.setItemAsync(key, 'verified');
    const stored = await SecureStore.getItemAsync(key);
    await SecureStore.deleteItemAsync(key);
    return stored === 'verified'
      ? { id: 'secure-store', label: 'Armazenamento seguro', status: 'ok', detail: 'Leitura e escrita protegidas disponíveis.' }
      : { id: 'secure-store', label: 'Armazenamento seguro', status: 'error', detail: 'O valor de teste não pôde ser recuperado.' };
  } catch {
    await SecureStore.deleteItemAsync(key).catch(() => undefined);
    return { id: 'secure-store', label: 'Armazenamento seguro', status: 'error', detail: 'Keychain/Keystore indisponível.' };
  }
}

async function checkNetwork(): Promise<DiagnosticItem> {
  try {
    const network = await Network.getNetworkStateAsync();
    if (network.isConnected === false || network.isInternetReachable === false) {
      return { id: 'network', label: 'Conectividade', status: 'warning', detail: 'Sem internet; o modo local continua disponível.' };
    }
    return { id: 'network', label: 'Conectividade', status: 'ok', detail: 'Rede disponível.' };
  } catch {
    return { id: 'network', label: 'Conectividade', status: 'warning', detail: 'Não foi possível determinar o estado da rede.' };
  }
}

async function checkNotifications(): Promise<DiagnosticItem> {
  if (Platform.OS === 'web') {
    return { id: 'notifications', label: 'Lembretes locais', status: 'warning', detail: 'Valide os lembretes em Android ou iOS.' };
  }
  try {
    const permission = await Notifications.getPermissionsAsync();
    const granted = permission.granted || permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return granted
      ? { id: 'notifications', label: 'Lembretes locais', status: 'ok', detail: `Permissão disponível; ${scheduled.length} lembrete(s) agendado(s).` }
      : { id: 'notifications', label: 'Lembretes locais', status: 'warning', detail: 'Permissão não concedida; o app não solicitará novamente sem ação do usuário.' };
  } catch {
    return { id: 'notifications', label: 'Lembretes locais', status: 'warning', detail: 'Não foi possível consultar os lembretes neste build.' };
  }
}

async function checkAuthentication(expectedUserId: string | null): Promise<DiagnosticItem> {
  if (!publicEnvironment.configured || !supabase) {
    return { id: 'backend', label: 'Backend de homologação', status: 'warning', detail: `Configuração ausente ou inválida (${publicEnvironment.problem ?? 'desconhecida'}).` };
  }

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    const activeUserId = data.session?.user.id ?? null;
    if (expectedUserId && activeUserId !== expectedUserId) {
      return { id: 'backend', label: 'Backend de homologação', status: 'error', detail: 'A sessão ativa não corresponde ao escopo local.' };
    }
    return activeUserId
      ? { id: 'backend', label: 'Backend de homologação', status: 'ok', detail: 'Configuração válida e sessão ativa.' }
      : { id: 'backend', label: 'Backend de homologação', status: 'warning', detail: 'Configuração válida, sem sessão ativa.' };
  } catch {
    return { id: 'backend', label: 'Backend de homologação', status: 'error', detail: 'Falha ao consultar a sessão protegida.' };
  }
}

async function checkSync(userId: string | null): Promise<DiagnosticItem> {
  if (!userId) {
    return { id: 'sync', label: 'Fila de sincronização', status: 'warning', detail: 'Entre em uma conta para validar a fila.' };
  }
  try {
    const state = await getLocalSyncState(userId);
    if (state.blocked > 0) {
      return { id: 'sync', label: 'Fila de sincronização', status: 'warning', detail: `${state.blocked} operação(ões) exigem nova tentativa assistida.` };
    }
    return { id: 'sync', label: 'Fila de sincronização', status: 'ok', detail: `${state.pending} operação(ões) pendente(s); nenhuma bloqueada.` };
  } catch {
    return { id: 'sync', label: 'Fila de sincronização', status: 'error', detail: 'Não foi possível ler o estado local da sincronização.' };
  }
}

export async function runDeviceDiagnostics(userId: string | null): Promise<DiagnosticReport> {
  const checks = await Promise.all([
    checkDatabase(),
    checkSecureStore(),
    checkNetwork(),
    checkNotifications(),
    checkAuthentication(userId),
    checkSync(userId),
  ]);

  checks.push({
    id: 'privacy-shield',
    label: 'Proteção de conteúdo',
    status: Platform.OS === 'web' ? 'warning' : 'ok',
    detail: Platform.OS === 'web'
      ? 'A proteção nativa do seletor de aplicativos não se aplica à versão web.'
      : 'Proteção nativa solicitada durante toda a sessão do aplicativo.',
  });

  return {
    generatedAt: new Date().toISOString(),
    platform: `${Platform.OS}-${String(Platform.Version)}`,
    checks,
  };
}
