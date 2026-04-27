class GeminiAdapter {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
  }

  async generate(systemPrompt, msg, history) {
    const contents = [];
    for (const turn of history) {
      if (turn.role && turn.text) {
        contents.push({ role: turn.role === "user" ? "user" : "model", parts: [{ text: turn.text }] });
      }
    }
    contents.push({ role: "user", parts: [{ text: msg }] });

    const url = `${this.baseUrl}?key=${this.apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents
      })
    });

    if (!response.ok) throw new Error(`Gemini error ${response.status}: ${await response.text()}`);

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate a response. Please try again.";
  }
}

module.exports = GeminiAdapter;
