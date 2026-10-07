// Edit this file to change the storefront's name, copy, ingredients, and price.
export const shopContent = {
  name: "Veath Crafted",
  contactEmail: "cveath@icloud.com",
  headline: "Handmade soap, made for you.",
  introduction: "Tell us the ingredients, scent, and feel you prefer. We make each bar to order and share the final formula before production.",
  product: {
    id: "custom-bar",
    name: "Your custom bar",
    // Set a real price in cents when ready. Zero keeps this a quote-only request site.
    startingPriceCents: 0,
    ingredients: [
      { name: "Olive oil", purpose: "A gentle, creamy base" },
      { name: "Coconut oil", purpose: "Helps create lather" },
      { name: "Shea butter", purpose: "Adds a rich feel" },
      { name: "Water", purpose: "Used in soapmaking" },
      { name: "Sodium hydroxide", purpose: "Used to turn oils into soap" },
    ],
  },
  scents: [
    { id: "unscented", label: "No added scent" },
    { id: "lavender", label: "Lavender" },
    { id: "citrus", label: "Citrus" },
  ],
  textures: [
    { id: "smooth", label: "Smooth" },
    { id: "oat", label: "Fine oat" },
    { id: "clay", label: "Clay" },
  ],
} as const;
