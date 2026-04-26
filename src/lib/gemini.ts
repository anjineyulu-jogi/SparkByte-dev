import { GoogleGenAI } from '@google/genai';

export async function processLiveScan(imageBase64: string, mimeType: string) {
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: "Analyze this grocery shelf frame. Identify any visible food products, barcodes, or nutrition labels. Provide short spatial guidance for a blind user (e.g., 'Move slightly left to center the barcode' or 'Scanning tomato soup'). Keep it to one short sentence." },
            { inlineData: { data: imageBase64, mimeType } }
          ]
        }
      ]
    });
    return response.text;
  } catch (err) {
    console.error("Vision API Error", err);
    return "Error: Could not process image at this time.";
  }
}

export async function processBarcodeScan(imageBase64: string, mimeType: string) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash',
      config: {
         responseMimeType: 'application/json',
         responseSchema: {
            type: 'OBJECT' as any,
            properties: {
               status: { type: 'STRING' as any, description: 'Either "found" or "searching"' },
               barcode: { type: 'STRING' as any, description: 'The 13 or 8 digit product barcode if readable full digits, otherwise empty' },
               guidance: { type: 'STRING' as any, description: 'Short spoken guidance to user e.g. "Move closer", "Tilt up", "Barcode detected", "Searching"' }
            },
            required: ['status', 'guidance']
         }
      },
      contents: [
        {
          role: 'user',
          parts: [
            { text: "Help me scan a barcode. Look closely at the image. If there's a barcode, tell me how to align it better, or extract it if it is clear." },
            { inlineData: { data: imageBase64, mimeType } }
          ]
        }
      ]
    });
    return JSON.parse(response.text || '{}');
  } catch (err) {
    console.error("Barcode API Error", err);
    return { status: 'searching', guidance: 'Network error, please hold still.' };
  }
}

export async function analyzeIngredients(ingredientsText: string, productName: string) {
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: [
        {
          role: 'user',
          parts: [
            { text: `You are Akshara, the SparkByte intelligence. You are empathetic, friendly, and use terms like "buddy" or "friend". Analyze these ingredients for "${productName}". 
            1. Decode biochemical names (e.g., E211 -> Sodium Benzoate, a preservative).
            2. Apply the "Kill Switch": Flag strictly any ingredient banned in EU/US markets but found in these products.
            3. Provide a C1-C10 summary rating (C10 being highest health risk, C1 being safe).
            Format the output using simple markdown with clear headers.
            
            Ingredients: ${ingredientsText}` }
          ]
        }
      ]
    });
    return response.text;
  } catch (err) {
    console.error("Akshara API Error", err);
    return "Hey buddy, I'm having trouble analyzing this right now. Please try again in a moment!";
  }
}

export async function compareProducts(products: {name: string, ingredients: string}[]) {
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });
  try {
    const promptData = products.map(p => `Product: ${p.name}\nIngredients: ${p.ingredients}`).join('\n\n');
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: [
        {
          role: 'user',
          parts: [
            { text: `You are Akshara. Please compare these products. Explain which one is healthier in an empathetic, friendly tone. Use "buddy" or "friend" to address the user. Give a final verdict.
            
            ${promptData}` }
          ]
        }
      ]
    });
    return response.text;
  } catch (err) {
    console.error("Akshara Comparison Error", err);
    return "Hey friend, I hit a snag comparing these. Let's try again!";
  }
}
