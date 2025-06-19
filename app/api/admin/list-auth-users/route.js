import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("SERVICE ROLE KEY:", !!serviceRoleKey, serviceRoleKey?.slice(0, 5));

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

export async function GET(request) {
  const adminToken = request.headers.get("x-admin-token");
  if (adminToken !== "LSBeryl") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ users: data.users });
}
