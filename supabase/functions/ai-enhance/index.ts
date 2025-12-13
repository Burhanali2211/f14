import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Get allowed origins from environment or use default
const getAllowedOrigins = (): string[] => {
  const allowedOrigins = Deno.env.get('ALLOWED_ORIGINS');
  if (allowedOrigins) {
    return allowedOrigins.split(',').map(origin => origin.trim());
  }
  // Default: allow same origin and common localhost ports
  return [
    'http://localhost:8080',
    'http://localhost:5173',
    'http://localhost:3000',
  ];
};

const getCorsHeaders = (origin: string | null): Record<string, string> => {
  const allowedOrigins = getAllowedOrigins();
  const requestOrigin = origin || '';
  
  // Check if origin is allowed or if it's from the same Supabase project
  const isAllowed = allowedOrigins.some(allowed => 
    requestOrigin === allowed || 
    requestOrigin.includes('supabase.co') ||
    requestOrigin.includes('netlify.app') ||
    requestOrigin.includes('vercel.app')
  );
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? requestOrigin : allowedOrigins[0] || '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
};

interface AIEnhanceRequest {
  text: string;
  action: 'improve_recitation' | 'add_pronunciation' | 'summarize' | 'explain' | 'enhance_reading';
  language?: string;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { text, action, language = 'Kashmiri' }: AIEnhanceRequest = await req.json();

    if (!text || typeof text !== 'string' || !text.trim()) {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!action || !['improve_recitation', 'add_pronunciation', 'summarize', 'explain', 'enhance_reading'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check both uppercase and lowercase (Supabase secrets might be case-sensitive)
    const aiProvider = Deno.env.get('AI_PROVIDER') || Deno.env.get('ai_provider') || 'huggingface'; // huggingface, groq, together, gemini
    let aiApiKey = Deno.env.get('AI_API_KEY') || Deno.env.get('ai_api_key') || 
                   Deno.env.get('HUGGINGFACE_API_KEY') || Deno.env.get('huggingface_api_key');
    if (aiProvider.toLowerCase() === 'gemini') {
      aiApiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('gemini_api_key') || aiApiKey;
    }
    
    if (!aiApiKey) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured. Please set AI_API_KEY or HUGGINGFACE_API_KEY environment variable.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await processAIEnhancement(text, action, language, aiProvider, aiApiKey);

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('AI enhancement error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'AI enhancement failed' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processAIEnhancement(
  text: string,
  action: string,
  language: string,
  provider: string,
  apiKey: string
): Promise<string> {
  let systemPrompt = '';
  let userPrompt = '';

  switch (action) {
    case 'improve_recitation':
      systemPrompt = `You are an expert in Islamic poetry recitation. Your task is to improve the recitation quality of the given text by:
1. Adding proper pauses and breaks (marked with ||BREAK||)
2. Suggesting emphasis on important words
3. Improving flow and rhythm
4. Maintaining the spiritual and emotional essence
5. Preserving all original text

Return the improved text with ||BREAK|| markers for pauses.`;
      userPrompt = `Improve the recitation of this ${language} text:\n\n${text}`;
      break;

    case 'add_pronunciation':
      if (language === 'Kashmiri') {
        systemPrompt = `You are an expert in Kashmiri pronunciation. Add pronunciation guides (in brackets) for difficult words, especially Arabic/Kashmiri terms. Be very careful with Kashmiri grammatical features and ensure correct pronunciation. Format: word [pronunciation]. Keep the original text intact.`;
      } else {
        systemPrompt = `You are an expert in ${language} pronunciation. Add pronunciation guides (in brackets) for difficult words, especially Arabic/Urdu terms. Format: word [pronunciation]. Keep the original text intact.`;
      }
      userPrompt = `Add pronunciation guides to this ${language} text:\n\n${text}`;
      break;

    case 'summarize':
      systemPrompt = `You are an expert in Islamic content. Provide a concise summary (2-3 sentences) of the given text while preserving its spiritual essence.`;
      userPrompt = `Summarize this ${language} text:\n\n${text}`;
      break;

    case 'explain':
      systemPrompt = `You are an expert in Islamic poetry and content. Provide a clear explanation of the meaning, context, and significance of the given text. Explain any cultural or religious references.`;
      userPrompt = `Explain this ${language} text:\n\n${text}`;
      break;

    case 'enhance_reading':
      systemPrompt = `You are an expert in enhancing reading experience. Improve the given text by:
1. Adding proper line breaks for better readability
2. Organizing verses/stanzas clearly
3. Adding subtle formatting markers (||BREAK|| for paragraph breaks)
4. Improving structure while preserving all original content
5. Making it easier to read and understand

Return the enhanced text.`;
      userPrompt = `Enhance the reading experience of this ${language} text:\n\n${text}`;
      break;

    default:
      throw new Error('Invalid action');
  }

  let result = '';
  
  try {
    switch (provider.toLowerCase()) {
      case 'huggingface':
        result = await callHuggingFace(userPrompt, systemPrompt, apiKey);
        break;
      case 'groq':
        result = await callGroq(userPrompt, systemPrompt, apiKey);
        break;
      case 'together':
        result = await callTogetherAI(userPrompt, systemPrompt, apiKey);
        break;
      case 'gemini':
        result = await callGemini(userPrompt, systemPrompt, apiKey);
        break;
      default:
        throw new Error(`Unknown AI provider: ${provider}. Supported: huggingface, groq, together, gemini`);
    }
  } catch (error) {
    console.error('AI API error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('AI service error');
  }
  
  if (!result) {
    throw new Error('No response from AI service');
  }

  return result;
}

async function callHuggingFace(userPrompt: string, systemPrompt: string, apiKey: string): Promise<string> {
  const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
  const response = await fetch('https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3.1-8B-Instruct', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: fullPrompt,
      parameters: {
        max_new_tokens: 2000,
        temperature: 0.3,
        return_full_text: false,
      },
    }),
  });

  if (!response.ok) {
    if (response.status === 503) {
      throw new Error('Model is loading. Please wait a moment and try again.');
    }
    throw new Error(`Hugging Face API error: ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) && data[0]?.generated_text 
    ? data[0].generated_text 
    : data.generated_text || '';
}

async function callGroq(userPrompt: string, systemPrompt: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    throw new Error(`Groq API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callTogetherAI(userPrompt: string, systemPrompt: string, apiKey: string): Promise<string> {
  const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
  const response = await fetch('https://api.together.xyz/inference', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'meta-llama/Llama-3-8b-chat-hf',
      prompt: fullPrompt,
      max_tokens: 2000,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    throw new Error(`Together AI error: ${response.status}`);
  }

  const data = await response.json();
  return data.output?.choices?.[0]?.text || '';
}

async function callGemini(userPrompt: string, systemPrompt: string, apiKey: string): Promise<string> {
  const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: fullPrompt,
        }],
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2000,
      },
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

