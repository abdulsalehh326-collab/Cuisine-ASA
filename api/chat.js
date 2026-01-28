export default async function handler(req, res) {
  // Gyara CORS
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

  if (!apiKey) {
    return res.status(500).json({ reply: "Error: API Key is missing." });
  }

  const { message, mode } = req.body;

  const systemPrompt = `You are a professional Chef. Mode: ${mode}. 
  IMPORTANT:
  1. If asked for a recipe, you MUST return a JSON Object ONLY. 
  Format: {"type":"recipe","title":"...","origin":"...","cookTime":"...","difficulty":"...","ingredients":[{"item":"...","amount":"..."}],"steps":["..."]}
  2. If asked a general question, return plain text.`;

  try {
    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://vercel.app", 
      },
      body: JSON.stringify({
        // WANNAN SHINE GYARAN: Mun sa model mai aiki 100%
        model: "google/gemini-2.0-flash-exp:free", 
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ]
      })
    });

    const data = await aiResponse.json();

    // Idan akwai matsala daga OpenRouter
    if (data.error) {
       console.error("OpenRouter Error:", data.error);
       // Idan wannan model din ya ki, gwada: "mistralai/mistral-7b-instruct:free"
       return res.status(500).json({ reply: "Model Error: " + data.error.message });
    }

    let content = data.choices[0].message.content;
    
    // Cleaning
    content = content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    content = content.replace(/```json/g, "").replace(/```/g, "").trim();

    // Duba ko Recipe ne
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
    return res.status(500).json({ reply: "Connection Error." });
  }
}
