export default async function handler(req, res) {
  // 1. Setup Headers don gyara CORS (Network Error)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // 2. Handle OPTIONS request (Browser Check)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 3. Tabbatar da API Key
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ reply: "Server Error: API Key is missing in Vercel." });
  }

  // 4. Karbar Sako
  const { message, mode } = req.body;

  const systemPrompt = `You are a Chef. Mode: ${mode}. 
  If asked for recipe, return JSON ONLY: 
  {"type":"recipe","title":"Name","origin":"Place","cookTime":"min","difficulty":"Level",
  "ingredients":[{"item":"name","amount":"qty"}],"steps":["Step 1","Step 2"]}. 
  If chat, return plain text. No markdown.`;

  try {
    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://vercel.app", 
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-r1:free", 
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ]
      })
    });

    const data = await aiResponse.json();
    let content = data.choices[0].message.content;
    
    // Cire <think> tags
    content = content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

    // Duba ko Recipe ne
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        try {
            const recipe = JSON.parse(jsonMatch[0]);
            if(recipe.type === 'recipe') {
                return res.status(200).json({ recipe: recipe });
            }
        } catch(e) {}
    }

    return res.status(200).json({ reply: content });

  } catch (error) {
    return res.status(500).json({ reply: "Network Error: Failed to connect to AI." });
  }
}
