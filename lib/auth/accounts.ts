/**
 * Account Model & Repository for JJ Claveria QFS.
 *
 * Model Specification (Section 5.3):
 * - id: Unique account identifier
 * - displayName: Name shown in UI and quotation metadata
 * - username: Account identifier used at login
 * - pinHash: Cryptographic scrypt hash of the PIN (salt:hash)
 * - active: Boolean flag indicating if account can log in
 * - createdAt: Timestamp of account creation
 * - updatedAt: Timestamp of last update
 *
 * ARCHITECTURAL BOUNDARY:
 * - In production, this repository is backed strictly by the database (Phase 6).
 * - No hardcoded accounts or credentials exist in the production authentication path.
 * - Development fixtures are isolated in dev-fixtures.ts and strictly disabled in production.
 */

export interface AuthAccount {
  id: string;
  username: string;
  displayName: string;
  pinHash: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export class AccountRepository {
  /**
   * Finds an active account by its username.
   *
   * In Phase 6, this will query Supabase:
   * `supabase.from('users').select('*').eq('username', username).eq('active', true).single()`
   */
  static async findActiveByUsername(username: string): Promise<AuthAccount | null> {
    if (process.env.NODE_ENV === "production") {
      // Production path: Database-backed only (Phase 6).
      // Hardcoded or fixture accounts are strictly barred from production.
      return null;
    }

    // Development scaffolding only
    const { getDevFixtureAccount } = await import("./dev-fixtures");
    return getDevFixtureAccount(username);
  }

  /**
   * Lists selectable active accounts.
   *
   * In Phase 6, this will query Supabase:
   * `supabase.from('users').select('username, display_name').eq('active', true)`
   */
  static async listActiveAccounts(): Promise<Array<{ username: string; displayName: string }>> {
    if (process.env.NODE_ENV === "production") {
      // Production path: Database-backed only (Phase 6).
      return [];
    }

    // Development scaffolding only
    const { listDevFixtureAccounts } = await import("./dev-fixtures");
    return listDevFixtureAccounts();
  }
}
