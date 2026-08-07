const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
	throw new Error(
		"Missing VITE_SUPABASE_URL or VITE_SUPABASE_KEY. Set them as build-time environment variables.",
	);
}

export { supabaseUrl, supabaseAnonKey };
