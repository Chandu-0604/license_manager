import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://upoidokfngddwjcsjnhv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwb2lkb2tmbmdkZHdqY3Nqbmh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MjUyNDcsImV4cCI6MjA4NDQwMTI0N30.SXDMag16IKgfDxBDrTDNhqV22j2vUtuOHnCy2-JqMYA";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
