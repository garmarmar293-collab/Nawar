declare module "@google/genai" {
  export enum Type {
    STRING = "string",
    OBJECT = "object",
  }

  export interface GenerateContentResponse {
    text?: string;
    candidates?: Array<any>;
  }

  export class GoogleGenAI {
    constructor(opts?: { apiKey?: string });
    models: {
      generateContent(opts: any): Promise<GenerateContentResponse>;
    };
  }

  export { GoogleGenAI as default };
}
