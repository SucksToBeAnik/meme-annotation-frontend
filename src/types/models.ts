import { Database } from "./supabase";

export type AnnotatedMeme = Database["public"]["Tables"]["annotated_memes"]["Row"];
