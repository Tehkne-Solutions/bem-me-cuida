import * as SecureStore from 'expo-secure-store';

export type BetaOperationPreferences = {
  technicalLogEnabled: boolean;
  includeDiagnosticsByDefault: boolean;
  includeTechnicalEventsByDefault: boolean;
};

export const defaultBetaOperationPreferences: BetaOperationPreferences = {
  technicalLogEnabled: false,
  includeDiagnosticsByDefault: true,
  includeTechnicalEventsByDefault: false,
};

function storageKey(userId: string): string {
  return `bemmecuida:beta-operation:${userId}`;
}

export async function readBetaOperationPreferences(userId: string): Promise<BetaOperationPreferences> {
  const raw = await SecureStore.getItemAsync(storageKey(userId));
  if (!raw) return defaultBetaOperationPreferences;

  try {
    const parsed = JSON.parse(raw) as Partial<BetaOperationPreferences>;
    return {
      technicalLogEnabled: parsed.technicalLogEnabled === true,
      includeDiagnosticsByDefault: parsed.includeDiagnosticsByDefault !== false,
      includeTechnicalEventsByDefault: parsed.includeTechnicalEventsByDefault === true,
    };
  } catch {
    return defaultBetaOperationPreferences;
  }
}

export async function saveBetaOperationPreferences(
  userId: string,
  preferences: BetaOperationPreferences,
): Promise<void> {
  await SecureStore.setItemAsync(storageKey(userId), JSON.stringify(preferences), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function clearBetaOperationPreferences(userId: string): Promise<void> {
  await SecureStore.deleteItemAsync(storageKey(userId));
}
