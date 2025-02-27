
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file')
    const demandeId = formData.get('demandeId')

    if (!file || !demandeId) {
      return new Response(
        JSON.stringify({ error: 'File and demandeId are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Vérifier que c'est bien un PDF
    if (file.type !== 'application/pdf') {
      return new Response(
        JSON.stringify({ error: 'Only PDF files are allowed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const fileName = `${demandeId}_${crypto.randomUUID()}.pdf`

    // Upload du fichier dans le bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('piece_identite')
      .upload(fileName, file)

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return new Response(
        JSON.stringify({ error: 'Failed to upload file' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Obtenir l'URL publique du fichier
    const { data: { publicUrl } } = supabase.storage
      .from('piece_identite')
      .getPublicUrl(fileName)

    // Mettre à jour la location avec l'URL du document
    const { data: demande, error: demandeError } = await supabase
      .from('demande')
      .select('bien_id')
      .eq('id', demandeId)
      .single()

    if (demandeError) {
      console.error('Demande fetch error:', demandeError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch demande' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const { error: locationError } = await supabase
      .from('location')
      .update({ cni_url: publicUrl })
      .eq('demande_id', demandeId)

    if (locationError) {
      console.error('Location update error:', locationError)
      return new Response(
        JSON.stringify({ error: 'Failed to update location' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    return new Response(
      JSON.stringify({ success: true, url: publicUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
