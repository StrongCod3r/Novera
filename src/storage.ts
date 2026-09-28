import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  deleteDoc,
  doc,
  enableNetwork,
  getDoc,
  getDocFromServer,
  getFirestore,
  serverTimestamp,
  setDoc,
  type Firestore
} from 'firebase/firestore';
import type { FirebaseConfiguration, IndexedDbConfiguration, StorageConfiguration, StorageProvider } from './config';

export interface StorageGateway {
  readonly provider: StorageProvider;
  initialize(): Promise<void>;
  reconnect(): Promise<boolean>;
  loadRegistry(): Promise<unknown | null>;
  saveRegistry(value: unknown): Promise<void>;
  loadWorkspace(vaultId: string): Promise<unknown | null>;
  saveWorkspace(vaultId: string, workspace: unknown): Promise<void>;
  deleteWorkspace(vaultId: string): Promise<void>;
}

type IndexedDbRecord = {
  key?: string;
  id?: string;
  value?: unknown;
  workspace?: unknown;
  updatedAt?: string;
};

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'));
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
  });
}

class IndexedDbStorageGateway implements StorageGateway {
  readonly provider = 'indexeddb' as const;
  private databasePromise: Promise<IDBDatabase> | null = null;

  constructor(private readonly configuration: IndexedDbConfiguration) {}

  async initialize(): Promise<void> {
    await this.openDatabase();
  }

  async reconnect(): Promise<boolean> {
    return true;
  }

  async loadRegistry(): Promise<unknown | null> {
    const record = await this.read(this.configuration.metaStore, this.configuration.registryKey);
    return record?.value ?? null;
  }

  async saveRegistry(value: unknown): Promise<void> {
    await this.write(this.configuration.metaStore, {
      key: this.configuration.registryKey,
      value,
      updatedAt: new Date().toISOString()
    });
  }

  async loadWorkspace(vaultId: string): Promise<unknown | null> {
    const record = await this.read(this.configuration.vaultStore, vaultId);
    return record?.workspace ?? null;
  }

  async saveWorkspace(vaultId: string, workspace: unknown): Promise<void> {
    await this.write(this.configuration.vaultStore, {
      id: vaultId,
      workspace,
      updatedAt: new Date().toISOString()
    });
  }

  async deleteWorkspace(vaultId: string): Promise<void> {
    const database = await this.openDatabase();
    const transaction = database.transaction(this.configuration.vaultStore, 'readwrite');
    const complete = transactionDone(transaction);
    transaction.objectStore(this.configuration.vaultStore).delete(vaultId);
    await complete;
  }

  private openDatabase(): Promise<IDBDatabase> {
    if (this.databasePromise) return this.databasePromise;

    this.databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.configuration.name, this.configuration.version);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(this.configuration.metaStore)) {
          database.createObjectStore(this.configuration.metaStore, { keyPath: 'key' });
        }
        if (!database.objectStoreNames.contains(this.configuration.vaultStore)) {
          database.createObjectStore(this.configuration.vaultStore, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => database.close();
        resolve(database);
      };
      request.onerror = () => reject(request.error ?? new Error('Could not open IndexedDB'));
      request.onblocked = () => reject(new Error('IndexedDB upgrade is blocked by another Novera tab'));
    });

    return this.databasePromise;
  }

  private async read(storeName: string, key: string): Promise<IndexedDbRecord | undefined> {
    const database = await this.openDatabase();
    const transaction = database.transaction(storeName, 'readonly');
    const complete = transactionDone(transaction);
    const record = await requestResult(transaction.objectStore(storeName).get(key));
    await complete;
    return record as IndexedDbRecord | undefined;
  }

  private async write(storeName: string, value: IndexedDbRecord): Promise<void> {
    const database = await this.openDatabase();
    const transaction = database.transaction(storeName, 'readwrite');
    const complete = transactionDone(transaction);
    transaction.objectStore(storeName).put(value);
    await complete;
  }
}

class FirebaseStorageGateway implements StorageGateway {
  readonly provider = 'firebase' as const;
  private readonly application: FirebaseApp;
  private readonly database: Firestore;

  constructor(configuration: FirebaseConfiguration) {
    this.application = getApps().length > 0 ? getApp() : initializeApp(configuration);
    this.database = getFirestore(this.application);
  }

  async initialize(): Promise<void> {
    // Firebase initializes synchronously when the app and Firestore instances are created.
  }

  async reconnect(): Promise<boolean> {
    try {
      await enableNetwork(this.database);
      await getDocFromServer(doc(this.database, 'noveraMeta', 'registry'));
      return true;
    } catch {
      return false;
    }
  }

  async loadRegistry(): Promise<unknown | null> {
    const snapshot = await getDoc(doc(this.database, 'noveraMeta', 'registry'));
    return snapshot.exists() ? snapshot.data()?.value ?? null : null;
  }

  async saveRegistry(value: unknown): Promise<void> {
    await setDoc(doc(this.database, 'noveraMeta', 'registry'), {
      value,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }

  async loadWorkspace(vaultId: string): Promise<unknown | null> {
    const snapshot = await getDoc(doc(this.database, 'noveraWorkspaces', vaultId));
    return snapshot.exists() ? snapshot.data()?.workspace ?? null : null;
  }

  async saveWorkspace(vaultId: string, workspace: unknown): Promise<void> {
    await setDoc(doc(this.database, 'noveraWorkspaces', vaultId), {
      workspace,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }

  async deleteWorkspace(vaultId: string): Promise<void> {
    await deleteDoc(doc(this.database, 'noveraWorkspaces', vaultId));
  }
}

export function createStorageGateway(configuration: StorageConfiguration): StorageGateway {
  if (configuration.provider === 'indexeddb') {
    return new IndexedDbStorageGateway(configuration.indexeddb);
  }
  return new FirebaseStorageGateway(configuration.firebaseConfig);
}
