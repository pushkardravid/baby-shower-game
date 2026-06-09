import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Use GET" });
  try {
    const { data, error } = await supabase.from("guest_predictions").select("*").order("created_at", { ascending: false }).limit(200);
    if (error) throw error;
    return res.status(200).json({ predictions: data || [] });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Failed to list predictions." });
  }
}
