import { createClient } from "@/lib/supabase/server"
import AnnotationDashboard from "./AnnotationDashboard"

export default async function Page() {
    const supabase = await createClient()
    const { data: annotated_memes, error } = await supabase.from("annotated_memes").select("*")
    if (error) {
        console.error("Error fetching annotated memes:", error)
        return <div>Error loading annotated memes.</div>
    }
    return (
        <div>
            <AnnotationDashboard memes={annotated_memes} />
        </div>
    )
}