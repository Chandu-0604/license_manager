import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://zyrgcinblulzbuizwfmt.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5cmdjaW5ibHVsemJ1aXp3Zm10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MDQ3NTcsImV4cCI6MjA3MDk4MDc1N30.j1KRoLUaPk0n_q0vOwisXSOY2nH1JDkiK27uKvt2ww8";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
