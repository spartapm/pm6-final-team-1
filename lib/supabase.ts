import { createClient } from "@supabase/supabase-js";

export const supabaseUrl = "https://afnmmsphrsccbdonkgwn.supabase.co";
export const supabasePublishableKey = "sb_publishable_4QDn9lw5dAwsrZhE_PQQ-g_OXf0aJhu";

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
