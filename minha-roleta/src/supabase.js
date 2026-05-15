import { createClient } from '@supabase/supabase-js'

// A sua Project URL
const supabaseUrl = 'https://wajdtouvjhveukaprdou.supabase.co'

// A chave Publishable que você acabou de copiar
const supabaseKey = 'sb_publishable_xtYGz3K4NKptmMCpTkvihQ_PcVfrGWu' // Cole a chave gigante inteira aqui!

export const supabase = createClient(supabaseUrl, supabaseKey)