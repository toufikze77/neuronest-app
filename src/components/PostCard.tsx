import { useEffect } from "react"
import { supabase } from "../lib/supabase"

export default function PostCard() {
  useEffect(() => {
    async function testSupabase() {
      const { data, error } = await supabase.from("your_table_name").select("*").limit(1)
      if (error) {
        console.error("Supabase error:", error.message)
      } else {
        console.log("Supabase connected! Sample data:", data)
      }
    }
    testSupabase()
  }, [])

  return <div>PostCard component</div>
}
