import { createClient } from '@supabase/supabase-js'




const supabaseUrl = 'https://crqjtylbcnfnnyviygmt.supabase.co/rest/v1/'

const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNycWp0eWxiY25mbm55dml5Z210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNTY0NjksImV4cCI6MjA5NTgzMjQ2OX0.XOzB0dl-GluMh_EHxbt2yKnwjNS89Fkguubna_gKzR0'



export const supabase = createClient(

  supabaseUrl,

  supabaseKey

)