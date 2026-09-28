export type StorageProvider = 'firebase' | 'indexeddb';

export interface FirebaseConfiguration {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

export interface IndexedDbConfiguration {
  name: string;
  version: number;
  metaStore: string;
  vaultStore: string;
  registryKey: string;
}

export interface StorageConfiguration {
  provider: StorageProvider;
  firebaseConfig: FirebaseConfiguration;
  indexeddb: IndexedDbConfiguration;
}

export const firebaseConfig: FirebaseConfiguration = Object.freeze({
  apiKey: 'AIzaSyCxb_05qC5TDepDDkZhsIqtw430DJv-n1c',
  authDomain: 'novera-d4d70.firebaseapp.com',
  projectId: 'novera-d4d70',
  storageBucket: 'novera-d4d70.firebasestorage.app',
  messagingSenderId: '92510289603',
  appId: '1:92510289603:web:dc610bf4156bf16c116c76',
  measurementId: 'G-50PZ73ZTTK'
});

// Change this value to 'indexeddb' to use the local browser database instead.
export const STORAGE_CONFIG: StorageConfiguration = Object.freeze({
  provider: 'firebase',
  firebaseConfig,
  indexeddb: Object.freeze({
    name: 'novera-local-workspace',
    version: 1,
    metaStore: 'meta',
    vaultStore: 'vaults',
    registryKey: 'registry'
  })
});
