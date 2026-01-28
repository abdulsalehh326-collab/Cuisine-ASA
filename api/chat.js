export default async function handler(req, res) {
  // Gyara CORS don kar ya hana waya shiga
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;

  // Duba ko akwai Key
  if (!apiKey) {
    return res.status(500).json({ reply: "Error: API Key is missing in Vercel Settings." });
  }

  const { message, mode } = req.body;

  const systemPrompt = `You are a professional Chef. Mode: ${mode}. 
  IMPORTANT:
  1. If asked for a recipe, you MUST return a JSON Object ONLY. No text before or after.
  Format: {"type":"recipe","title":"...","origin":"...","cookTime":"...","difficulty":"...","ingredients":[{"item":"...","amount":"..."}],"steps":["..."]}
  2. If asked a general question, return plain text.`;

  try {
    // NA CANZA MODEL ZUWA GEMINI (MAI SAURI)
    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://vercel.app", 
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-lite-preview-02-05:free", 
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ]
      })
    });

    const data = await aiResponse.json();

    // Idan OpenRouter ya dawo da Error
    if (data.error) {
       console.error("OpenRouter Error:", data.error);
       return res.status(500).json({ reply: "AI Error: " + data.error.message });
    }

    let content = data.choices[0].message.content;
    
    // Cire <think> idan ya fito (ko da yake Gemini baya yi)
    content = content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    
    // Cire ```json da ``` idan sun fito
    content = content.replace(/```json/g, "").replace(/```/g, "").trim();

    // Duba ko Recipe ne (JSON)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        try {
            const recipe = JSON.parse(jsonMatch[0]);
            if(recipe.type === 'recipe' || recipe.ingredients) {
                return res.status(200).json({ recipe: recipe });
            }
        } catch(e) {}
    }

    return res.status(200).json({ reply: content });

  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ reply: "Connection Error: Please try again." });
  }
}
