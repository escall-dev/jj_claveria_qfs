import type { AuthAccount } from "./accounts";

/**
 * Development-Only Account Fixtures for JJ Claveria QFS.
 *
 * SAFETY GUARD:
 * This module is strictly restricted to development environments.
 * It will immediately fail if evaluated or executed in production.
 *
 * NOTE: Plaintext PIN values are NEVER stored here or in any source file.
 * Only salted cryptographic hashes are used.
 */

function ensureDevelopmentEnvironment(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "CRITICAL SECURITY VIOLATION: Development account fixtures cannot be accessed in production."
    );
  }
}

// Development fixtures with pre-computed scrypt hashes
const DEV_FIXTURE_ACCOUNTS: AuthAccount[] = [
  {
    id: "usr_dev_admin_001",
    username: "admin",
    displayName: "System Administrator",
    pinHash:
      "scrypt:5f14069f451e25f84e20aed988d661df:e6391ad087eea5509c233de8501c2cb246b7bf17d069c08050e55340e92b71f9435a28097e8f896e379030ee3f9a0b702eeaf101867501c7d0ab4337352a19ea",
    active: true,
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
  },
  {
    id: "usr_dev_claveria_002",
    username: "claveria",
    displayName: "JJ Claveria",
    pinHash:
      "scrypt:1ed2eedf93b4c510587e0d7e8f2de2fb:127b818608e2a5d12a4f294537ead47bd319074ab52fb07d4e272fbe5110af5ff891358ad9a8b2d0e710c56e1139f68b0e89e734e3f9fc0a28432f96dd4c99fb",
    active: true,
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
  },
  {
    id: "usr_dev_staff_003",
    username: "staff",
    displayName: "Sales Staff",
    pinHash:
      "scrypt:8a903bfae82faea73b9c96d1145e1972:abb65d5bd12cb1adcfd67347b4edcf1496aadb9e04a279713f90da3db41681ea7884635f2383db037b09f99a66c3423df9858e68bdda6c552cf07ba57cb5a369",
    active: true,
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
  },
];

export function getDevFixtureAccount(username: string): AuthAccount | null {
  ensureDevelopmentEnvironment();
  const normalized = username.trim().toLowerCase();
  const account = DEV_FIXTURE_ACCOUNTS.find(
    (acc) => acc.active && acc.username.toLowerCase() === normalized
  );
  return account ? { ...account } : null;
}

export function listDevFixtureAccounts(): Array<{
  username: string;
  displayName: string;
}> {
  ensureDevelopmentEnvironment();
  return DEV_FIXTURE_ACCOUNTS.filter((acc) => acc.active).map((acc) => ({
    username: acc.username,
    displayName: acc.displayName,
  }));
}
