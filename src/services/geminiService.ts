import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getOperationalSummary(data: any) {
  const model = "gemini-3-flash-preview";
  const prompt = `
    You are an AI Building Operations Copilot for TowerPilot Ethiopia.
    Analyze the following building operational data and provide a concise summary.
    
    Data: ${JSON.stringify(data)}
    
    Format your response as follows:
    1. Operational Summary: A short overview.
    2. Urgent Issues: Critical items.
    3. Overdue Items: Late tasks/payments.
    4. Recurring Problems: Patterns detected.
    5. Tenant / Financial Concerns: Revenue or satisfaction risks.
    6. Recommended Actions: Ranked list of next steps.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
    });
    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Failed to generate AI summary.";
  }
}

export async function askCopilot(question: string, context: any) {
  const model = "gemini-3-flash-preview";
  const prompt = `
    You are an AI Building Operations Copilot for TowerPilot Ethiopia.
    Answer the user's question based on the provided building data.
    
    Context: ${JSON.stringify(context)}
    Question: ${question}
    
    Provide a professional, actionable response.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
    });
    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I'm sorry, I couldn't process that request right now.";
  }
}
