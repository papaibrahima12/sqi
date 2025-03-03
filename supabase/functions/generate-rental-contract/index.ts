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
    console.log('location', location)

    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage()
    const { width, height } = page.getSize()

    const pngUrl = "https://usercontent.one/wp/www.sqigroupsn.com/wp-content/uploads/2024/03/logo-transparency-1.png?media=1711825347"

    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)

    const pngImageBytes = await fetch(pngUrl).then((res) => res.arrayBuffer())
    const pngImage = await pdfDoc.embedPng(pngImageBytes)
    const pngDims = pngImage.scale(0.3)

    page.drawImage(pngImage, {
      x: (width - pngDims.width) / 2,
      y: height - 100,
      width: 200,
      height: 100
    })

    page.drawText("CONTRAT DE LOCATION JOURNALIÈRE", {
      x: (width - helveticaBold.widthOfTextAtSize("CONTRAT DE LOCATION JOURNALIÈRE", 18)) / 2,
      y: height - 130,
      size: 18,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    })

    const drawWrappedText = (text, x, y, size, lineHeight, maxWidth) => {
      const words = text.split(' ');
      let line = '';
      let currentY = y;

      // On gère ici les sauts de ligne (\n)
      const lines = text.split('\n');
      lines.forEach((lineText) => {
        const wordsInLine = lineText.split(' ');
        line = '';
        for (const word of wordsInLine) {
          const testLine = line + (line ? ' ' : '') + word;
          const lineWidth = helvetica.widthOfTextAtSize(testLine, size);

          if (lineWidth > maxWidth && line !== '') {
            page.drawText(line, { x, y: currentY, size, font: helvetica });
            line = word;
            currentY -= lineHeight;
          } else {
            line = testLine;
          }
        }

        if (line) {
          page.drawText(line, { x, y: currentY, size, font: helvetica });
          currentY -= lineHeight;
        }
        currentY -= lineHeight;
      });

      return currentY;
    };

    let currentY = height - 180
    const margin = 15
    const contentWidth = width - (margin * 2)
    const lineHeight = 14
    const paragraphSpacing = 10

    currentY = drawWrappedText(
        `Ce contrat de location journalière est conclu entre le bailleur SQI Group, ci-après désigné "le bailleur", et ${location?.client?.prenom} ${location?.client?.nom}, ci-après désigné "le locataire".`,
        margin,
        currentY,
        11,
        lineHeight,
        contentWidth
    ) - paragraphSpacing

    // Property details
    currentY = drawWrappedText(
        `Article 1 : OBJET DU CONTRAT\nLe bailleur met à disposition du locataire le bien "${location?.property?.libelle}" situé à ${location?.property?.residence?.nom} pour une durée déterminée.`,
        margin,
        currentY,
        11,
        lineHeight,
        contentWidth
    ) - paragraphSpacing

    // Duration
    currentY = drawWrappedText(
        `Article 2 : DURÉE\nLa présente location est consentie pour une durée d'une journée, à compter du ${new Date(location?.date_debut).toLocaleDateString()} jusqu'au ${new Date(location?.date_fin).toLocaleDateString()}.`,
        margin,
        currentY,
        11,
        lineHeight,
        contentWidth
    ) - paragraphSpacing

    // Payment
    currentY = drawWrappedText(
        `Article 3 : LOYER ET CHARGES\nLe montant de la location est fixé à ${location?.property?.prix_journalier} FCFA / jour, payable par virement ou par espèces avant l'entrée dans les lieux.`,
        margin,
        currentY,
        11,
        lineHeight,
        contentWidth
    ) - paragraphSpacing

    // Obligations
    currentY = drawWrappedText(
        `Article 4 : OBLIGATIONS DU LOCATAIRE\nLe locataire s'engage à utiliser les lieux conformément à leur destination, à respecter les règles de voisinage et à rendre le bien en bon état. Toute dégradation constatée sera à la charge du locataire.`,
        margin,
        currentY,
        11,
        lineHeight,
        contentWidth
    ) - paragraphSpacing

    // Deposit
    currentY = drawWrappedText(
        `Article 5 : DÉPÔT DE GARANTIE\nLe bailleur se réserve le droit de retenir tout ou partie du dépôt de garantie en cas de dommages constatés lors de l'état des lieux de sortie.`,
        margin,
        currentY,
        11,
        lineHeight,
        contentWidth
    ) - paragraphSpacing

    // Keys
    currentY = drawWrappedText(
        `Article 6 : REMISE DES CLÉS\nLe locataire reconnaît avoir reçu les clés du bien et s'engage à les restituer à la fin de la location.`,
        margin,
        currentY,
        11,
        lineHeight,
        contentWidth
    ) - paragraphSpacing

    // Termination
    currentY = drawWrappedText(
        `Article 7 : RÉSILIATION\nEn cas de non-respect des termes du contrat, le bailleur pourra mettre fin à la location sans remboursement.`,
        margin,
        currentY,
        11,
        lineHeight,
        contentWidth
    ) - paragraphSpacing

    // Final clause
    currentY = drawWrappedText(
        `Les parties déclarent accepter les conditions de la présente convention en toute bonne foi.`,
        margin,
        currentY,
        11,
        lineHeight,
        contentWidth
    ) - paragraphSpacing * 2

    currentY -= paragraphSpacing * 2 // Ajustement avant d'afficher la date

    // Date and signatures
    page.drawText(`Fait à Dakar, le ${new Date().toLocaleDateString()}`, {
      x: margin,
      y: currentY,
      size: 11,
      font: helvetica,
    })

    currentY -= paragraphSpacing * 2

    // Signature blocks
    page.drawText(`Signature du bailleur:`, {
      x: margin,
      y: currentY,
      size: 11,
      font: helveticaBold,
    })

    page.drawText(`Signature du locataire:`, {
      x: width - margin - 150,
      y: currentY,
      size: 11,
      font: helveticaBold,
    })

    currentY -= 15

    // Signature lines
    page.drawLine({
      start: { x: margin, y: currentY },
      end: { x: margin + 150, y: currentY },
      thickness: 1,
      color: rgb(0, 0, 0),
    })

    page.drawLine({
      start: { x: width - margin - 150, y: currentY },
      end: { x: width - margin, y: currentY },
      thickness: 1,
      color: rgb(0, 0, 0),
    })

    // Save the PDF
    const pdfBytes = await pdfDoc.save()

    // Initialize Supabase client
    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Upload the generated PDF to storage
    const fileName = `contrat_${location?.id}_${Date.now()}.pdf`
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