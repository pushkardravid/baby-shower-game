import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function isAuthed(req) {
  const expected = process.env.ADMIN_PASSWORD || "";
  if (!expected) return true;
  const actual = req.headers["x-admin-password"];
  return actual === expected;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Use GET" });
  if (!isAuthed(req)) return res.status(401).json({ error: "Unauthorized" });

  try {
    const { data, error } = await supabase
      .from("guest_predictions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw error;
    return res.status(200).json({ predictions: data || [] });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error?.message || "Failed to load admin data." });
  }
}
