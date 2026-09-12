import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { AuditAction, AuditEntityType, AuditLog } from '../types';

export interface RecordAuditInput {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  summary: string;
}

export async function logAuditEvent(input: RecordAuditInput): Promise<string> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.warn('Cannot record audit log: unauthenticated user.');
    return '';
  }

  const payload: Omit<AuditLog, 'id'> = {
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    summary: input.summary,
    performedByUid: currentUser.uid,
    performedByEmail: currentUser.email || '',
    createdAt: new Date().toISOString(),
  };

  try {
    const docRef = await addDoc(collection(db, 'auditLogs'), payload);
    return docRef.id;
  } catch (error) {
    // Log error using required handler
    handleFirestoreError(error, OperationType.CREATE, 'auditLogs');
  }
}
