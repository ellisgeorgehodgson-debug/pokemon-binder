import { createClient } from '@supabase/supabase-js'

// Prefer environment variables from Vite: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
// Fallback to the hardcoded values if env vars are not present.
const DEFAULT_SUPABASE_URL = 'https://crqjtylbcnfnnyviygmt.supabase.co'
const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNycWp0eWxiY25mbm55dml5Z210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNTY0NjksImV4cCI6MjA5NTgzMjQ2OX0.XOzB0dl-GluMh_EHxbt2yKnwjNS89Fkguubna_gKzR0'

function normalizeSupabaseUrl(url) {
	if (!url || typeof url !== 'string') return url
	// Remove any trailing slash
	let out = url.replace(/\/+$/, '')
	// If someone configured the full REST path, strip it (the SDK appends `/rest/v1` internally)
	if (/\/rest\/v1$/i.test(out)) {
		console.warn('Supabase URL contained `/rest/v1`; stripping that segment to avoid duplicate paths.')
		out = out.replace(/\/rest\/v1$/i, '')
	}
	return out
}

const rawUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL
const supabaseUrl = normalizeSupabaseUrl(rawUrl)

const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY

// Expose the normalized URL for runtime debugging and log it so you can verify the value in the browser console.
export const SUPABASE_URL_DEBUG = supabaseUrl
console.info('[debug] Supabase URL (normalized):', SUPABASE_URL_DEBUG)

export const supabase = createClient(supabaseUrl, supabaseKey)