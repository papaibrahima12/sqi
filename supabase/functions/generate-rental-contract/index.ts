
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { location } = await req.json()

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage()
    const { width, height } = page.getSize()
    const pngUrl = "https://usercontent.one/wp/www.sqigroupsn.com/wp-content/uploads/2024/03/logo-transparency-1.png?media=1711825347";
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const pngImageBytes = await fetch(pngUrl).then((res) => res.arrayBuffer())
    const pngImage = await pdfDoc.embedPng(pngImageBytes)
    const pngDims = pngImage.scale(0.5)

    page.drawText(`
    Ce contrat de location journalière est conclu entre le bailleur en tant que entité SQI et le locataire ${location?.client.prenom + " " + location?.client.nom}. 
    Le bailleur met à disposition du locataire le bien ${location?.property?.libelle} situé à ${location?.property?.residence?.nom} pour une durée d’une journée, à compter du ${new Date(location.date_debut).toLocaleDateString()} jusqu’au ${new Date(location.date_fin).toLocaleDateString()}. 
    Le montant de la location est fixé à ${location?.property?.prix_journalier} payable par virement ou par espèces.
    Le locataire s’engage à utiliser les lieux conformément à leur destination, à respecter les règles de voisinage et à rendre le bien en bon état.
     Toute dégradation constatée sera à la charge du locataire. Le bailleur se réserve le droit de retenir tout ou partie du dépôt de garantie d’un montant de [Montant du Dépôt de Garantie] en cas de dommages.
    Le locataire reconnaît avoir reçu les clés du bien et s’engage à les restituer à la fin de la location. En cas de non-respect des termes du contrat, le bailleur pourra mettre fin à la location sans remboursement. Les parties déclarent accepter les conditions de la présente convention en toute bonne foi
    `, {
      x: 50,
      y: height - 50,
      size: 20,
      font,
      padding: 20,
      color: rgb(0, 0, 0),
    })


    page.drawText(`Fait à Dakar, le ${new Date().toLocaleDateString()}`, {
      x: 50,
      y: height - 450,
      size: 12,
      font,
    })

    page.drawText(`Le propriétaire`, {
      x: 50,
      y: height - 500,
      size: 12,
      font,
    })

    page.drawText(`Le locataire`, {
      x: width - 150,
      y: height - 500,
      size: 12,
      font,
    })

    // Save the PDF
    const pdfBytes = await pdfDoc.save()

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Upload the generated PDF to storage
    const fileName = `contrat_${location.id}_${Date.now()}.pdf`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: false
      })

    if (uploadError) {
      throw uploadError
    }

    const { data: { signedUrl }, error: signedUrlError } = await supabase.storage
      .from('documents')
      .createSignedUrl(fileName, 300)

    if (signedUrlError) {
      throw signedUrlError
    }

    return new Response(
      JSON.stringify({ signedUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
