import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://optlghedswctsklcxlkn.supabase.co'
const supabaseAnonKey = 'sb_publishable_mVQHSs67SUw7oeuKrlGaHQ_1NX3ocs4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'stigg' }
})
