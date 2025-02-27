
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
    const { demande } = await req.json()

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage()
    const { width, height } = page.getSize()
    const pngUrl = "https://usercontent.one/wp/www.sqigroupsn.com/wp-content/uploads/2024/03/logo-transparency-1.png?media=1711825347";
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const pngImageBytes = await fetch(pngUrl).then((res) => res.arrayBuffer())
    const pngImage = await pdfDoc.embedPng(pngImageBytes)
    const pngDims = pngImage.scale(0.5)
    // Add content to the PDF

    page.drawText('CONTRAT DE VENTE', {
      x: 50,
      y: height - 50,
      size: 20,
      font,
      color: rgb(0, 0, 0),
    })

    // Add tenant information
    page.drawText(`ENTRE LES SOUSSIGNÉS:`, {
      x: 50,
      y: height - 100,
      size: 12,
      font,
    })

    page.drawText(`Le propriétaire: SQI SERVICES`, {
      x: 50,
      y: height - 130,
      size: 12,
      font,
    })

    page.drawText(`ET`, {
      x: 50,
      y: height - 160,
      size: 12,
      font,
    })

    page.drawText(`L'acheteur: ${demande.prenom} ${demande.nom}`, {
      x: 50,
      y: height - 190,
      size: 12,
      font,
    })

    // Add property information
    page.drawText(`BIEN LOUÉ:`, {
      x: 50,
      y: height - 230,
      size: 12,
      font,
    })

    page.drawText(`${demande.property.libelle}`, {
      x: 50,
      y: height - 250,
      size: 12,
      font,
    })

    // Add rental terms
    page.drawText(`DURÉE DE LA LOCATION:`, {
      x: 50,
      y: height - 290,
      size: 12,
      font,
    })

    // Add financial terms
    page.drawText(`CONDITIONS FINANCIÈRES:`, {
      x: 50,
      y: height - 350,
      size: 12,
      font,
    })

    page.drawText(`Prix de vente: ${demande.property?.price} FCFA`, {
      x: 50,
      y: height - 370,
      size: 12,
      font,
    })


    // Add signature fields
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

    page.drawText(`L'acheteur`, {
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
    const fileName = `contrat_${demande.id}_${Date.now()}.pdf`
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, pdfBytes, {
          contentType: 'application/pdf',
          upsert: false
        })

    if (uploadError) {
      throw uploadError
    }

    // Create a signed URL for the uploaded PDF
    const { data: { signedUrl }, error: signedUrlError } = await supabase.storage
        .from('documents')
        .createSignedUrl(fileName, 300) // URL valid for 5 minutes

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
