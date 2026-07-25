import type { ConfigContext, ExpoConfig } from 'expo/config';

type AppVariant = 'development' | 'preview' | 'beta' | 'rc' | 'production';

type VariantConfig = { name: string; scheme: string; androidPackage: string; iosBundleIdentifier: string };

const variants: Record<AppVariant, VariantConfig> = {
  development: {
    name: 'BemMeCuida Dev',
    scheme: 'bemmecuida-dev',
    androidPackage: 'com.tehknesolutions.bemmecuida.dev',
    iosBundleIdentifier: 'com.tehknesolutions.bemmecuida.dev',
  },
  preview: {
    name: 'BemMeCuida Preview',
    scheme: 'bemmecuida-preview',
    androidPackage: 'com.tehknesolutions.bemmecuida.preview',
    iosBundleIdentifier: 'com.tehknesolutions.bemmecuida.preview',
  },
  beta: {
    name: 'BemMeCuida Beta',
    scheme: 'bemmecuida-beta',
    androidPackage: 'com.tehknesolutions.bemmecuida.beta',
    iosBundleIdentifier: 'com.tehknesolutions.bemmecuida.beta',
  },
  rc: {
    name: 'BemMeCuida RC',
    scheme: 'bemmecuida-rc',
    androidPackage: 'com.tehknesolutions.bemmecuida.rc',
    iosBundleIdentifier: 'com.tehknesolutions.bemmecuida.rc',
  },
  production: {
    name: 'BemMeCuida',
    scheme: 'bemmecuida',
    androidPackage: 'com.tehknesolutions.bemmecuida',
    iosBundleIdentifier: 'com.tehknesolutions.bemmecuida',
  },
};

function resolveVariant(): AppVariant {
  const value = process.env.APP_VARIANT;
  return value === 'development'
    || value === 'preview'
    || value === 'beta'
    || value === 'rc'
    || value === 'production'
    ? value
    : 'development';
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = resolveVariant();
  const selected = variants[variant];

  return {
    ...config,
    name: selected.name,
    slug: 'bem-me-cuida',
    scheme: selected.scheme,
    version: config.version ?? '0.10.0',
    extra: {
      ...config.extra,
      appVariant: variant,
      releaseCandidate: process.env.EXPO_PUBLIC_RELEASE_CANDIDATE?.trim() || null,
      eas: process.env.EXPO_PUBLIC_EAS_PROJECT_ID
        ? { projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID }
        : config.extra?.eas,
    },
    ios: {
      ...config.ios,
      bundleIdentifier: selected.iosBundleIdentifier,
    },
    android: {
      ...config.android,
      package: selected.androidPackage,
    },
  };
};
