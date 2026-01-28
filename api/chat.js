export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // Karanta saƙon daga index.html
  const { message, mode } = await req.json();

  // Dauko API Key daga Vercel Environment Variables
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ reply: "Server Config Error: API Key missing" }), { status: 500 });
  }

  const systemPrompt = `You are a Chef. Mode: ${mode}. 
  If asked for recipe, return JSON ONLY: 
  {"type":"recipe","title":"Name","origin":"Place","cookTime":"min","difficulty":"Level",
  "ingredients":[{"item":"name","amount":"qty"}],"steps":["Step 1","Step 2"]}. 
  If chat, return plain text. No markdown.`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://vercel.app", 
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-r1",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ]
      })
    });

    const data = await response.json();
    let content = data.choices[0].message.content;

    // Cire <think> tags na DeepSeek
    content = content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

    // Duba ko Recipe ne (JSON)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        try {
            const recipe = JSON.parse(jsonMatch[0]);
            if(recipe.type === 'recipe') {
                return new Response(JSON.stringify({ recipe: recipe }), { status: 200 });
            }
        } catch(e) {}
    }

    // Idan ba recipe bane, rubutu ne
    return new Response(JSON.stringify({ reply: content }), { status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ reply: "Network Error" }), { status: 500 });
  }
}
