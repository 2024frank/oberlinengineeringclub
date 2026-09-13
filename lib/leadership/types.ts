export type OfficerPosition = { id: string; roleTitle: string; term: string; bio: string; closesAt: string | null }
export type OfficerApplication = {
  positionId: string; roleTitle: string; term: string; userId: string; displayName: string;
  statement: string; experience: string; status: 'PENDING' | 'SHORTLISTED' | 'NOT_SELECTED' | 'WITHDRAWN';
  feedback: string; submittedAt: string; reviewedAt: string | null;
}
export type OfficerEmailStatus = { positionId: string; roleTitle: string; baseline: boolean; pending: number; sending: number; sent: number; failed: number; unknown: number; skipped: number }
