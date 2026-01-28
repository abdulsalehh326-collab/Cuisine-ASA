export default async function handler(req, res) {
  // CORS Headers
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
  if (!apiKey) return res.status(500).json({ reply: "API Key Missing" });

  const { message, mode } = req.body;

  // LISSAFIN MODELS (Idan na daya ya ki, zai gwada na biyu, da na uku)
  const MODELS = [
    "google/gemini-2.0-flash-lite-preview-02-05:free", // Na Farko (Sauri)
    "google/gemini-2.0-flash-exp:free",              // Na Biyu (Backup 1)
    "mistralai/mistral-7b-instruct:free",            // Na Uku (Mai Kwari)
    "deepseek/deepseek-r1:free"                      // Na Karshe (Mai Tunani)
  ];

  const systemPrompt = `You are a Chef. Mode: ${mode}. 
  If asked for a recipe, return JSON ONLY.
  Format: {"type":"recipe","title":"...","origin":"...","cookTime":"...","difficulty":"...","ingredients":[{"item":"...","amount":"..."}],"steps":["..."]}
  If chat, return plain text.`;

  // Wannan Loop din shine zai gwada Models din daya-bayan-daya
  for (const model of MODELS) {
    try {
      console.log(`Trying model: ${model}...`); // Don mu gani a logs

      const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://vercel.app", 
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message }
          ]
        })
      });

      const data = await aiResponse.json();

      // Idan wannan Model din ya bada Error, sai mu tsallake zuwa na gaba
      if (data.error) {
        console.error(`Model ${model} failed:`, data.error);
        continue; // Gwada na gaba
      }

      // Idan ya yi nasara:
      let content = data.choices[0].message.content;
      
      // Cleaning
      content = content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
      content = content.replace(/```json/g, "").replace(/```/g, "").trim();

      // Check JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
          try {
              const recipe = JSON.parse(jsonMatch[0]);
              if(recipe.type === 'recipe' || recipe.ingredients) {
                  return res.status(200).json({ recipe: recipe });
              }
          } catch(e) {}
      }

      // Return Text
      return res.status(200).json({ reply: content });

    } catch (error) {
      console.error(`Connection failed for ${model}`);
      // Continue to next model
    }
  }

  // Idan DUKA sun ki (kusan ba zai yiwu ba):
  return res.status(500).json({ reply: "Duk Models suna busy. Dan Allah gwada anjima." });
}
