/**
 * In-memory stand-in for the Supabase client, used only by automated tests:
 *   - component tests (jest.ui.setup.js)
 *   - Maestro flow builds made with EXPO_PUBLIC_E2E=1 (see src/lib/supabase.ts)
 *
 * It covers just the calls the app makes. It starts signed in, so tests land
 * on the main list, and keeps items in memory (a fresh launch starts empty).
 */

type Row = Record<string, unknown> & { id: string };
type AuthListener = (event: string, session: FakeSession | null) => void;

interface FakeSession {
  user: { id: string; email: string };
}

const ok = <T>(data: T) => ({ data, error: null });

export function createFakeSupabase() {
  const user = { id: 'e2e-user', email: 'tester@example.com' };
  let session: FakeSession | null = { user };
  let rows: Row[] = [];
  const listeners = new Set<AuthListener>();

  function setSession(next: FakeSession | null, event: string) {
    session = next;
    listeners.forEach((l) => l(event, session));
  }

  function upsertOne(row: Row) {
    const i = rows.findIndex((r) => r.id === row.id);
    rows = i === -1 ? [...rows, row] : rows.map((r, j) => (j === i ? row : r));
  }

  return {
    auth: {
      getSession: async () => ok({ session }),
      getUser: async () => ok({ user: session?.user ?? null }),
      onAuthStateChange: (cb: AuthListener) => {
        listeners.add(cb);
        return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } };
      },
      signInWithPassword: async ({ email }: { email: string }) => {
        setSession({ user: { ...user, email } }, 'SIGNED_IN');
        return ok({ session });
      },
      signUp: async ({ email }: { email: string }) => {
        setSession({ user: { ...user, email } }, 'SIGNED_IN');
        return ok({ session });
      },
      signOut: async () => {
        setSession(null, 'SIGNED_OUT');
        return { error: null };
      },
      resetPasswordForEmail: async () => ok({}),
      updateUser: async () => ok({ user: session?.user ?? null }),
    },

    from: (_table: string) => ({
      select: () => ({
        order: async () => ok([...rows]),
      }),
      upsert: async (input: Row | Row[]) => {
        (Array.isArray(input) ? input : [input]).forEach(upsertOne);
        return { error: null };
      },
      delete: () => ({
        eq: async (_column: string, id: string) => {
          rows = rows.filter((r) => r.id !== id);
          return { error: null };
        },
      }),
    }),

    rpc: async () => {
      rows = [];
      return { error: null };
    },
  };
}
