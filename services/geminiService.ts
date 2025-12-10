import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { GenerationConfig, AnalysisResult } from "../types";

// --- MASTER PHOTOGRAPHY PROMPT ---
// Updated to be High-End Commercial & General Design focused, not just wedding.
const PHOTOGRAPHY_MASTER_PROMPT = `
STYLE: High-end commercial photography, award-winning editorial style, luxury brand aesthetic.
EQUIPMENT: Shot on Hasselblad X2D 100C or Phase One IQ4, 80mm f/1.9 lens.
QUALITY: 8k resolution, hyper-realistic, exquisite texture details, perfect lighting.
LIGHTING: Professional cinematic lighting, soft diffused light, high dynamic range (HDR), masterful control of highlights and shadows.
COMPOSITION: Balanced and elegant composition, depth of field to separate subject from background (bokeh) where appropriate.
`;

/**
 * 辅助函数：将 Base64 字符串转换为 Gemini 兼容的部分
 */
const base64ToPart = (base64: string, mimeType: string = "image/png") => {
  // 移除 data URL 前缀 (data:image/png;base64,...)
  // Handle cases where the string might not have the prefix or different mimetype
  const data = base64.includes(',') ? base64.split(',')[1] : base64; 
  return {
    inlineData: {
      data,
      mimeType
    }
  };
};

/**
 * 分析上传的图片内容 (使用 gemini-2.5-flash，避免 pro 模型的权限问题)
 * 用于 "产品提取" 和 "辅助生成 Prompt"
 */
export const analyzeImage = async (base64Image: string): Promise<AnalysisResult> => {
  // 每次请求前重新初始化，确保获取最新的 API Key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const imagePart = base64ToPart(base64Image);
    const prompt = `
    作为一名专业的电商视觉总监，请分析这张图片。
    1. 描述图片中的核心商品（婚纱/配饰）的细节，包括材质、颜色、风格。
    2. 描述模特的姿势、人种和表情。
    3. 描述背景环境和光影效果。
    
    请以 JSON 格式返回，包含 'description' (详细描述) 和 'tags' (关键词列表)。
    不要使用 Markdown 代码块。直接返回 JSON 字符串。
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Downgraded from gemini-3-pro-preview to reduce 403 chance on basic analysis
      contents: {
        parts: [imagePart, { text: prompt }]
      },
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text || "{}";
    return JSON.parse(text) as AnalysisResult;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error; // 让 UI 层处理错误 (如 403)
  }
};

/**
 * 智能优化 Prompt (使用 gemini-2.5-flash)
 * 用于 "创意生图" 和 "换背景" 的文案润色
 */
export const enhancePrompt = async (input: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const systemPrompt = `
    Role: Professional E-commerce Photographer & AI Prompt Engineer.
    Task: Expand the user's basic input into a high-quality, professional image generation prompt suitable for Amazon/Shein product photography.
    
    Guidelines:
    1. Lighting: Add professional lighting terms (e.g., "soft studio lighting", "cinematic rim light", "natural window light").
    2. Atmosphere: Enhance the vibe (e.g., "luxury", "minimalist", "romantic wedding atmosphere").
    3. Technical: Add quality keywords (e.g., "8k resolution", "photorealistic", "sharp focus", "highly detailed", "bokeh").
    4. Composition: Suggest composition if missing (e.g., "eye-level shot", "symmetrical", "rule of thirds").
    
    Input: "${input}"
    
    Output: Return ONLY the enhanced prompt string in English. Do not add conversational text.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: systemPrompt,
    });

    return response.text?.trim() || input;
  } catch (error) {
    console.error("Prompt Enhancement Error:", error);
    // 失败时返回原文本，不中断流程
    return input;
  }
};

/**
 * 生成图片 (智能选择模型)
 * 优先使用 gemini-2.5-flash-image 以提高成功率
 * 仅在需要高分辨率(2K/4K)时尝试 gemini-3-pro-image-preview，并支持自动回退
 */
export const generateImage = async (config: GenerationConfig): Promise<string> => {
  // 每次请求前重新初始化，确保获取最新的 API Key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // 1. 构建 Prompt (保持原逻辑)
  let parts: any[] = [];
  
  // 强制电商优化逻辑 + 大师级摄影 Prompt
  let finalPrompt = `
  ${PHOTOGRAPHY_MASTER_PROMPT}
  ${config.prompt}
  `;

  if (config.negativePrompt) {
    finalPrompt += `\nNegative prompt: ${config.negativePrompt}`;
  }

  // --- Special Handling for MASKING (Eraser / Local Enhancement) ---
  if (config.maskImage) {
      // Order: Original Image, Mask Image, Prompt
      if (config.referenceImage) {
          parts.push(base64ToPart(config.referenceImage));
          parts.push(base64ToPart(config.maskImage));

          const maskInstruction = `
          [INSTRUCTION]: The second image provided is a MASK. 
          The WHITE area in the mask indicates the selection. 
          The BLACK area in the mask should remain UNCHANGED.
          Apply the changes ONLY to the white masked region.
          `;
          finalPrompt = maskInstruction + finalPrompt;
      }
  } 
  // --- Special Handling for Fusion (Multiple Images) ---
  else if (config.workflow === 'fusion') {
      if (config.referenceImages && config.referenceImages.length > 0) {
          config.referenceImages.forEach(img => parts.push(base64ToPart(img)));
          finalPrompt = `[Instruction]: The provided images are multiple angles/details of the SAME product (mannequin). Analyze all images to understand the garment's structure, fabric, and details comprehensively. \n` + finalPrompt;
      } else if (config.referenceImage) {
           parts.push(base64ToPart(config.referenceImage));
      }
  }
  // --- Special Handling for Background Swap ---
  else if (config.workflow === 'bg_swap') {
      if (config.referenceImage) {
          parts.push(base64ToPart(config.referenceImage));
          
          let bgInstruction = `[Instruction]: You are a world-class photo retoucher and compositor. `;
          bgInstruction += `TASK: Background Replacement. `;
          bgInstruction += `PRESERVE: The main subject (product/person) MUST remain exactly identical in pose, clothing, and features. Do not change the subject. `;
          bgInstruction += `CHANGE: Replace the background completely based on the description to create a masterpiece. `;
          
          if (config.bgSwapConfig?.lighting) {
              const lightingMap: Record<string, string> = {
                  'soft': 'Soft, diffused softbox lighting, flattering for wedding portraits, minimal shadows.',
                  'natural': 'Natural daylight, golden hour sun-kissed look, warm and organic tones.',
                  'studio': 'High-contrast professional studio strobe lighting, sharp shadows, commercial look.',
                  'cinematic': 'Dramatic cinematic lighting, rim light to separate subject from background, moody atmosphere.'
              };
              bgInstruction += `LIGHTING: ${lightingMap[config.bgSwapConfig.lighting]} Ensure the subject's lighting blends realistically with the new background. `;
          }

          if (config.bgSwapConfig?.sceneType) {
               if (config.bgSwapConfig.sceneType === 'vintage') {
                  bgInstruction += `ATMOSPHERE: Nostalgic, warm tones, film grain texture, rich details, elegant and timeless. `;
               } else if (config.bgSwapConfig.sceneType === 'natural') {
                  bgInstruction += `ATMOSPHERE: Fresh air, organic textures, wide dynamic range, airy and romantic. `;
               } else if (config.bgSwapConfig.sceneType === 'classical') {
                  bgInstruction += `ATMOSPHERE: Grand, aristocratic, luxury textures (stone, marble, velvet), serious and holy. `;
               } else if (config.bgSwapConfig.sceneType === 'modern') {
                  bgInstruction += `ATMOSPHERE: Clean lines, neutral colors, minimalist, high-fashion magazine style. `;
               }
          }

          if (config.bgSwapConfig?.blur && config.bgSwapConfig.blur > 0) {
               const blurDesc = config.bgSwapConfig.blur > 60 ? 'Strong bokeh, creamy background blur, f/1.2 aperture' : 
                                config.bgSwapConfig.blur > 30 ? 'Moderate depth of field, pleasing bokeh, f/2.8 aperture' :
                                'Slight depth of field separation, f/5.6 aperture';
               bgInstruction += `DEPTH OF FIELD: ${blurDesc}. Focus strictly on the product. `;
          }

          finalPrompt = bgInstruction + finalPrompt;
      }
  }
  // --- Special Handling for Face Swap ---
  else if (config.workflow === 'face_swap') {
      if (config.referenceImage) {
          parts.push(base64ToPart(config.referenceImage));
          
          let swapInstruction = `[Instruction]: This first image is the PRODUCT/BODY REFERENCE. `;
          if (config.faceSwapConfig?.mode === 'model_swap') {
               swapInstruction += `Keep the outfit and background exactly as is. GENERATE A NEW MODEL (face, hair, skin tone) inside the clothes. `;
          } else if (config.faceSwapConfig?.mode === 'head_swap') {
               swapInstruction += `Keep the outfit, body posture, and background. SWAP THE HEAD AND HAIR only. `;
          } else {
               swapInstruction += `Keep the outfit, hair, body, and background. SWAP ONLY THE FACIAL FEATURES (eyes, nose, mouth). `;
          }
          finalPrompt = swapInstruction + finalPrompt;
      }

      if (config.faceImage) {
          parts.push(base64ToPart(config.faceImage));
          let similarity = config.faceSwapConfig?.similarity || 80;
          finalPrompt = `[Instruction]: This second image is the FACE REFERENCE. Target Similarity: ${similarity}%. ` + finalPrompt;
      } 
  } 
  // --- Standard Workflows (Creative, Fission, etc) ---
  else {
      if (config.poseImage) {
          parts.push(base64ToPart(config.poseImage));
          finalPrompt = `[Instruction]: Use this first image as a POSE REFERENCE (skeleton/structure). The generated model must follow this exact pose.\n\n${finalPrompt}`;
      }
      if (config.referenceImage && !config.maskImage) {
          parts.push(base64ToPart(config.referenceImage));
          finalPrompt = `[Instruction]: Use this image as the CONTENT REFERENCE (Subject/Product). Maintain the character's outfit and product details from this image.\n\n${finalPrompt}`;
      }
  }
  
  parts.push({ text: finalPrompt });

  // 2. 执行生成 (支持模型回退)
  
  // 辅助函数：执行请求
  const executeRequest = async (model: string) => {
      const imageConfig: any = {
          aspectRatio: config.aspectRatio,
      };
      
      // 注意：gemini-2.5-flash-image 不支持 imageSize
      if (model === 'gemini-3-pro-image-preview') {
          imageConfig.imageSize = config.imageSize;
      }

      return await ai.models.generateContent({
          model: model,
          contents: { parts },
          config: { imageConfig }
      });
  };

  try {
      // 策略：默认使用 flash-image (1K)，如果是 2K/4K 则升级到 pro。
      // 如果 pro 失败 (403)，则降级到 flash-image 自动重试。
      let targetModel = 'gemini-2.5-flash-image';
      
      if (config.imageSize === '2K' || config.imageSize === '4K') {
          targetModel = 'gemini-3-pro-image-preview';
      }

      let response: GenerateContentResponse;
      
      try {
          response = await executeRequest(targetModel);
      } catch (error: any) {
          // 捕获 403 权限错误或 404 模型未找到错误
          const isAuthError = error.status === 403 || error.message?.includes('403') || error.message?.includes('PERMISSION_DENIED');
          const isNotFoundError = error.status === 404 || error.message?.includes('404');

          if ((isAuthError || isNotFoundError) && targetModel === 'gemini-3-pro-image-preview') {
              console.warn("Gemini Pro Image Model failed (Auth/NotFound). Falling back to Flash Image.");
              // 降级重试 (注意：Flash 模型不支持 imageSize，在 executeRequest 中已处理)
              response = await executeRequest('gemini-2.5-flash-image');
          } else {
              throw error; // 其他错误抛出
          }
      }

      // 解析返回的图片数据
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          return `data:image/png;base64,${base64EncodeString}`;
        }
      }

      throw new Error("未生成任何图片数据 (No image data returned)");

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error; 
  }
};