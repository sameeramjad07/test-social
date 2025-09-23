export function buildConsistentBrandPrompt({
  storeName,
  commission,
  category,
  displayUrl,
}: {
  storeName: string;
  commission: string | null;
  category: string;
  displayUrl: string;
}) {
  return `Create a PROFESSIONAL BRAND-CONSISTENT promotional image for ${storeName}.

MANDATORY SPECIFICATIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔒 FIXED DIMENSIONS (CRITICAL):
• Exact size: 1024x1024 pixels (perfect square)
• Aspect ratio: 1:1 (no deviation allowed)
• Format: High-quality PNG
• Resolution: Ultra-sharp, social media optimized

🎨 PROMOWAVES BRAND TEMPLATE:
• Color Palette: 
  - Primary: Deep navy blue (#1a365d) or charcoal (#2d3748)
  - Secondary: Bright accent blue (#3182ce) or teal (#319795)  
  - Highlight: Gold/yellow (#ffd700) for offers
  - Background: Always use a relevant full-bleed background image (photo, illustration, or gradient) that matches shopping/brand context. Never leave background plain white. Must feel premium, modern, and dynamic. Use subtle overlays if needed to keep text readable.

• Typography Standards:
  - Header: Bold, modern sans-serif (Montserrat/Inter style)
  - Body: Clean, readable sans-serif
  - Hierarchy: Maximum 3 text levels
  - Alignment: Left-aligned or centered, consistent spacing

• Layout Framework:
  - Grid: 12-column layout with proper margins
  - Spacing: 16px base unit for consistent padding
  - Balance: Golden ratio composition (62/38 split)
  - Whitespace: Generous, professional breathing room

📝 CONTENT STRUCTURE (FIXED ORDER):
1. HEADER ZONE (Top 20%):
   - Promowaves logo (top-left corner, 48px height)
   - Store category badge (top-right, subtle)

2. MAIN CONTENT (Middle 60%):
   - Store name: "${storeName}" (prominent, 42px, bold)
   - Commission offer: "${
     commission || "EXCLUSIVE PARTNERSHIP"
   }" (highlighted, 28px)
   - Store logo: Integrated naturally (max 120px width)

3. FOOTER ZONE (Bottom 20%):
   - Website: "${displayUrl}" (subtle, 14px, bottom-right)
   - Call-to-action: "Shop Now →" (button style, bottom-left)

🏷️ BRAND CONSISTENCY RULES:
• Style: Professional, trustworthy, premium feel
• Mood: Confident, reliable, growth-focused
• Effects: Subtle gradients, soft shadows, clean edges
• Icons: Minimal, consistent stroke width (2px)

⚠️ STRICT REQUIREMENTS:
• NO random colors - use specified palette only
• NO cluttered layouts - follow template structure
• NO inconsistent fonts - maintain typography hierarchy
• NO off-brand elements - professional appearance only
• MUST look like part of cohesive brand family
• MUST maintain Promowaves visual identity

Generate a perfectly consistent 1024x1024 pixel brand template that looks professional and part of the same design system.`;
}

export async function buildPromptContent({
  prompt,
  workspaceUrl,
  storeLogo,
  storeDisplayUrl,
  commission,
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
      // FIXED: Add specific branding instructions
      promptContent.push({
        text: `BRAND LOGO PLACEMENT: Position Promowaves logo in top-left corner, 48px height, maintain clear space of 16px from edges. Logo should be clearly visible but not dominating.`,
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

      // FIXED: Add store logo placement instructions
      promptContent.push({
        text: `STORE LOGO PLACEMENT: Integrate store logo naturally in the main content area, maximum 120px width, maintain aspect ratio, ensure it complements the overall design without overpowering text elements.`,
      });
    } catch (error) {
      console.warn(`Failed to fetch store logo:`, error);
    }
  }

  // FIXED: Add consistent styling for URL and commission
  if (storeDisplayUrl) {
    promptContent.push({
      text: `FOOTER URL STYLING: Display "${storeDisplayUrl}" in bottom-right corner, 14px font size, subtle gray color (#718096), professional font weight, 16px margin from edges.`,
    });
  }

  if (commission) {
    promptContent.push({
      text: `COMMISSION HIGHLIGHT STYLING: Display "${commission}" prominently in main content area, 28px font size, gold/yellow highlight color (#ffd700), bold font weight, ensure high contrast and readability.`,
    });
  }

  // FIXED: Add final brand consistency check
  promptContent.push({
    text: `FINAL BRAND CHECK: Ensure the entire design looks cohesive, professional, and part of the same brand family. All elements should work together harmoniously while maintaining the Promowaves brand standards.`,
  });

  return promptContent;
}
