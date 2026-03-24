// Supabase completely mocked for local-only Missing Club execution
export const supabase = {
  auth: {
    getSession: async () => ({ data: { session: null } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithOAuth: async () => {},
    signOut: async () => {}
  },
  from: () => ({
    insert: () => ({ select: async () => ({ data: null, error: null }) }),
    select: () => ({
      eq: () => ({
        order: () => ({ limit: async () => ({ data: null, error: null }) }),
        limit: async () => ({ data: null, error: null })
      }),
      order: () => ({ limit: async () => ({ data: [], error: null }) })
    })
  })
}

export async function saveScoreToGlobal() { return { data: null, error: null } }
export async function fetchGlobalLeaderboard() { return { data: [], error: null } }
export async function signInWithGoogle() {}
export async function signOutUser() {}
export async function saveDailyScore() { return { data: null, error: null } }
export async function fetchDailyLeaderboard() { return { data: [], error: null } }
export async function createLeague() { return { data: null, error: null } }
export async function fetchLeague() { return { data: null, error: null } }
export async function saveLeagueScore() { return { data: null, error: null } }
export async function fetchLeagueScores() { return { data: [], error: null } }
export async function fetchUserScores() { return { data: [], error: null } }
