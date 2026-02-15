
import { GoogleGenAI, Type } from "@google/genai";
import { Product } from "../types";

// تهيئة Gemini مباشرة في الواجهة الأمامية لضمان العمل الفوري
// سيتم استخدام مفتاح API من البيئة المحيطة تلقائياً
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export const generateTechnicalAdvice = async (userMessage: string, base64Image?: string, mimeType: string = 'image/jpeg') => {
  try {
    const model = 'gemini-3-pro-preview'; // للمهام المعقدة والاستشارات التقنية
    const parts: any[] = [{ text: userMessage }];

    if (base64Image) {
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: base64Image,
        },
      });
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: [{ role: 'user', parts }],
      config: {
        systemInstruction: `أنت "مساعد المامو الفني" الخبير الأول في خردوات حلب. 
        تحدث بلهجة حلبية عريقة (يا غالي، ع راسي، تكرم شاربك). 
        قدم حلولاً هندسية دقيقة للأعطال المنزلية والمهنية. 
        اقترح دائماً استخدام أدوات بوش أو ماكيتا الأصلية المتوفرة عند المامو.`,
        temperature: 0.8,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Frontend Error:", error);
    return "يا غالي، صار في ضغط على الشبكة. جرب تبعتلي سؤالك مرة تانية وتكرم عينك.";
  }
};

export const generateAIImage = async (prompt: string, aspectRatio: "1:1" | "16:9" | "9:16" = "1:1") => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
        },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Image Gen Error:", error);
    return null;
  }
};

export const estimateDimensions = async (base64Image: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            { text: "حلل هذه الصورة وقدر الأبعاد (الطول والعرض) بالسنتمتر بدقة. أعطِ النتائج بلهجة حلبية ودودة." },
            { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
          ]
        }
      ],
    });
    return response.text;
  } catch (err) {
    return "تعذر تحليل القياسات حالياً يا طيب.";
  }
};

export const analyzeRoomPaint = async (base64Image: string, colorName: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            { text: `المستخدم اختار لون ${colorName}. حلل إضاءة الغرفة في الصورة وأعطِ نصيحة حلبية إذا كان اللون مناسباً أو يحتاج تعديل.` },
            { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
          ]
        }
      ],
    });
    return response.text;
  } catch (err) {
    return "تعذر تحليل اللون حالياً.";
  }
};

export const processAdminAgent = async (userCommand: string, currentProducts: Product[], currentRate: number) => {
  try {
    const context = `Current Exchange Rate: ${currentRate} SYP/USD. Products: ${JSON.stringify(currentProducts.map(p => ({id: p.id, name: p.name, price: p.priceUSD})))}`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Context: ${context}\nCommand: ${userCommand}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            response: { type: Type.STRING },
            action: { type: Type.STRING, description: "ADD_PRODUCT, UPDATE_PRODUCT, DELETE_PRODUCT, SET_RATE, QUERY" },
            payload: { type: Type.OBJECT }
          },
          required: ["response", "action"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    return { response: "فشل تنفيذ الأمر الإداري ذكياً.", action: "ERROR" };
  }
};
