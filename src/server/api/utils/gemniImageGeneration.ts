export function buildEnhancedPrompt({
  storeName,
  commission,
  category,
  displayUrl,
  imageSize
}: {
  storeName: string;
  commission: string | null;
  category: string;
  displayUrl: string;
  imageSize: string;
}) {
  return `Create a PREMIUM ${imageSize} promotional banner for ${storeName}.
Generate a perfectly SQUARE ${imageSize} pixel image with equal width and height, maintaining 1:1 aspect ratio for Instagram/social media format.

DESIGN SPECIFICATIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 FORMAT REQUIREMENTS:
• Exact dimensions: ${imageSize} pixels
• Format: Square social media banner
• Resolution: Ultra-high quality, crisp details

📝 TEXT HIERARCHY (Maximum 3 elements):
1. PRIMARY: "${storeName}" - Bold, prominent brand name
2. SECONDARY: "${commission || 'EXCLUSIVE OFFER'}" - Eye-catching highlight
3. CTA: "Shop Now" or simple arrow/button - Minimal, clear action

🎨 VISUAL COMPOSITION:
• Layout: Golden ratio composition, balanced negative space
• Color Scheme: 
  - Primary: Bold, high-contrast brand colors
  - Accent: Vibrant highlight for commission/offer
  - Background: Clean gradient or subtle pattern
• Typography: 
  - Modern, sans-serif for readability
  - Variable font weights for hierarchy
  - Proper kerning and line spacing

🏷️ BRAND ELEMENTS:
• Promowaves logo: Top corner as quality badge
• ${storeName} logo: Integrated naturally in design
• Website footer: "${displayUrl}" (subtle, 8-10pt, bottom edge)

🎭 STYLE DIRECTION:
• Industry: ${category || 'retail'} sector aesthetic
• Mood: Professional, trustworthy, action-oriented
• Trend: Contemporary flat design with depth
• Effects: Subtle shadows, modern gradients, clean edges

⚠️ STRICT CONSTRAINTS:
• NO cluttered layouts or text walls
• NO low-quality or pixelated elements  
• NO misleading or exaggerated claims
• MUST be mobile-optimized and thumb-friendly
• MUST maintain brand consistency

Generate a perfectly SQUARE ${imageSize} pixel image with equal width and height, maintaining 1:1 aspect ratio for Instagram/social media format.

Generate a stunning, conversion-focused design that commands attention.`;
}

export  async function buildPromptContent({
  prompt,
  workspaceUrl,
  storeLogo,
  storeDisplayUrl,
  commission
}: {
  prompt: string;
  workspaceUrl: string;
  storeLogo?: string;
  storeDisplayUrl?: string;
  commission?: string | null;
}) {
  const promptContent: any[] = [{ text: prompt }];

  // Add Promowaves logo
  if (workspaceUrl) {
    try {
      const logoResp = await fetch(workspaceUrl);
      const logoArrayBuffer = await logoResp.arrayBuffer();
      const logoBase64 = Buffer.from(logoArrayBuffer).toString("base64");
      
      promptContent.push({
        inlineData: {
          mimeType: logoResp.headers.get("content-type") || "image/png",
          data: logoBase64,
        },
      });
    } catch (error) {
      console.warn("Failed to fetch Promowaves logo:", error);
    }
  }

  // Add store logo
  if (storeLogo) {
    try {
      const storeLogoResp = await fetch(storeLogo);
      const storeLogoBuffer = await storeLogoResp.arrayBuffer();
      const storeLogoBase64 = Buffer.from(storeLogoBuffer).toString("base64");
      
      promptContent.push({
        inlineData: {
          mimeType: storeLogoResp.headers.get("content-type") || "image/png",
          data: storeLogoBase64,
        },
      });
    } catch (error) {
      console.warn(`Failed to fetch store logo:`, error);
    }
  }

  // Add specific instructions for commission and URL
  if (storeDisplayUrl) {
    promptContent.push({
      text: `Footer text (small, subtle): ${storeDisplayUrl}`,
    });
  }

  if (commission) {
    promptContent.push({
      text: `Highlight text (bold, prominent): ${commission}`,
    });
  }

  return promptContent;
}