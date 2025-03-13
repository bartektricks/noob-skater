import { createClient } from "@supabase/supabase-js";
import type { Database, Tables } from "./supabase.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLIC_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export async function getActiveServers(): Promise<
	Tables<"noob-skater-server-list">[]
> {
	const { data, error } = await supabase
		.from("noob-skater-server-list")
		.select("*")
		.order("created_at", { ascending: false });

	if (error) {
		console.error("Error fetching servers:", error);
		return [];
	}

	return data || [];
}

export async function addServer(serverName: string): Promise<string | null> {
	const { data, error } = await supabase
		.from("noob-skater-server-list")
		.insert({
			server_name: serverName,
		})
		.select("id");

	if (error) {
		console.error("Error adding server:", error);
		return null;
	}

	return data && data.length > 0 ? data[0].id : null;
}

export async function removeServer(id: string): Promise<boolean> {
	const { error } = await supabase
		.from("noob-skater-server-list")
		.delete()
		.eq("id", id);

	if (error) {
		console.error("Error removing server:", error);
		return false;
	}

	return true;
}
