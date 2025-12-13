import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Get allowed origins from environment or use default
const getAllowedOrigins = (): string[] => {
  const allowedOrigins = Deno.env.get('ALLOWED_ORIGINS');
  if (allowedOrigins) {
    return allowedOrigins.split(',').map(origin => origin.trim());
  }
  return [
    'http://localhost:8080',
    'http://localhost:5173',
    'http://localhost:3000',
  ];
};

const getCorsHeaders = (origin: string | null): Record<string, string> => {
  const allowedOrigins = getAllowedOrigins();
  const requestOrigin = origin || '';
  
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

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  // Diagnostic endpoint to check configuration (remove in production)
  if (req.method === 'GET') {
    const provider = Deno.env.get('AI_PROVIDER') || Deno.env.get('ai_provider') || 'not set';
    const hasAIKey = !!(Deno.env.get('AI_API_KEY') || Deno.env.get('ai_api_key'));
    const hasHuggingFaceKey = !!(Deno.env.get('HUGGINGFACE_API_KEY') || Deno.env.get('huggingface_api_key'));
    const hasGeminiKey = !!(Deno.env.get('GEMINI_API_KEY') || Deno.env.get('gemini_api_key'));
    
    return new Response(JSON.stringify({ 
      provider,
      hasAIKey,
      hasHuggingFaceKey,
      hasGeminiKey,
      message: 'Configuration check - remove GET handler in production'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed. Use POST.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return new Response(JSON.stringify({ error: 'Invalid request body. Expected JSON.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { text, sourceLanguage = 'Hinglish', targetLanguage = 'Urdu' } = requestBody;
    
    // Use same AI provider setup as other functions (check both uppercase and lowercase)
    const aiProvider = Deno.env.get('AI_PROVIDER') || Deno.env.get('ai_provider') || 'huggingface';
    console.log('AI Provider:', aiProvider);
    
    // Get API key based on provider (check both cases)
    let aiApiKey = Deno.env.get('AI_API_KEY') || Deno.env.get('ai_api_key') || 
                   Deno.env.get('HUGGINGFACE_API_KEY') || Deno.env.get('huggingface_api_key');
    
    const providerLower = aiProvider.toLowerCase();
    if (providerLower === 'gemini') {
      const geminiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('gemini_api_key');
      if (geminiKey) {
        aiApiKey = geminiKey;
      }
    }
    
    console.log('API Key found:', !!aiApiKey, 'Provider:', providerLower);
    
    if (!aiApiKey) {
      console.error('AI API key not configured. Available env vars:', {
        hasAI_API_KEY: !!Deno.env.get('AI_API_KEY'),
        hasAi_api_key: !!Deno.env.get('ai_api_key'),
        hasHUGGINGFACE_API_KEY: !!Deno.env.get('HUGGINGFACE_API_KEY'),
        hasHuggingface_api_key: !!Deno.env.get('huggingface_api_key'),
        hasGEMINI_API_KEY: !!Deno.env.get('GEMINI_API_KEY'),
        hasGemini_api_key: !!Deno.env.get('gemini_api_key'),
      });
      return new Response(JSON.stringify({ 
        error: 'Translation service not configured. Please set AI_API_KEY or HUGGINGFACE_API_KEY in Supabase secrets.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!text || text.trim() === '') {
      return new Response(JSON.stringify({ translatedText: '' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Translating from ${sourceLanguage} to ${targetLanguage}:`, text.substring(0, 100) + '...');

    // Enhanced system prompt based on target language
    let systemPrompt = '';
    if (targetLanguage === 'Kashmiri') {
      systemPrompt = `You are an expert translator specializing in translating ${sourceLanguage} to Kashmiri script (Perso-Arabic script). 

Your task:
1. Translate the given ${sourceLanguage} text to proper Kashmiri script using Perso-Arabic script (similar to Urdu Nastaliq style)
2. Maintain the poetic structure, line breaks, paragraph breaks, and all formatting exactly as provided
3. Preserve all special markers like ||BREAK|| or ||PARA|| that indicate paragraph/shaair breaks
4. Keep the emotional and spiritual essence of the text intact
5. Use proper Kashmiri vocabulary and grammar with authentic Perso-Arabic script
6. Pay special attention to Kashmiri grammatical features and ensure correct usage
7. If there are any Islamic terms or names, use their proper Kashmiri/Arabic spellings
8. Maintain the rhythm and meter of poetry if applicable
9. Preserve any existing Kashmiri/Urdu/Arabic text in the input

IMPORTANT: 
- Only output the translated Kashmiri text
- Do not add any explanations, notes, or English text
- Preserve all line breaks and formatting markers exactly as they appear
- Use proper Kashmiri Perso-Arabic script with correct diacritics where appropriate
- Be very careful with Kashmiri grammar and ensure grammatical correctness`;
    } else if (targetLanguage === 'Urdu') {
      systemPrompt = `You are an expert translator specializing in translating ${sourceLanguage} to Urdu script. 

Your task:
1. Translate the given ${sourceLanguage} text to proper Urdu script (Nastaliq style)
2. Maintain the poetic structure, line breaks, paragraph breaks, and all formatting exactly as provided
3. Preserve all special markers like ||BREAK|| or ||PARA|| that indicate paragraph/shaair breaks
4. Keep the emotional and spiritual essence of the text intact
5. Use proper Urdu vocabulary and grammar with authentic Nastaliq script
6. If there are any Islamic terms or names, use their proper Urdu/Arabic spellings
7. Maintain the rhythm and meter of poetry if applicable
8. Preserve any existing Urdu/Arabic text in the input

IMPORTANT: 
- Only output the translated Urdu text
- Do not add any explanations, notes, or English text
- Preserve all line breaks and formatting markers exactly as they appear
- Use proper Urdu Nastaliq script with correct diacritics where appropriate`;
    } else if (targetLanguage === 'Arabic') {
      systemPrompt = `You are an expert translator specializing in translating ${sourceLanguage} to Arabic script.

Your task:
1. Translate the given ${sourceLanguage} text to proper Arabic script
2. Maintain the poetic structure, line breaks, and formatting
3. Preserve all special markers like ||BREAK|| or ||PARA||
4. Use proper Arabic vocabulary and grammar
5. Maintain the spiritual and religious context

IMPORTANT: Only output the translated Arabic text. Do not add explanations.`;
    } else {
      systemPrompt = `You are an expert translator specializing in translating ${sourceLanguage} to ${targetLanguage}.

Your task:
1. Translate the given ${sourceLanguage} text to ${targetLanguage}
2. Maintain the poetic structure, line breaks, paragraph breaks, and formatting
3. Preserve all special markers like ||BREAK|| or ||PARA||
4. Keep the emotional and spiritual essence intact

IMPORTANT: Only output the translated text. Do not add explanations.`;
    }

    const userPrompt = `Translate the following ${sourceLanguage} text to ${targetLanguage}:\n\n${text}`;

    // Use the same AI provider functions as ai-enhance
    const translatedText = await translateWithAI(userPrompt, systemPrompt, aiProvider, aiApiKey);

    if (!translatedText) {
      console.warn('Translation returned empty text');
      return new Response(JSON.stringify({ error: 'Translation service returned empty result. Please try again.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('Translation successful');

    return new Response(JSON.stringify({ translatedText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Translation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Translation failed';
    const errorDetails = error instanceof Error ? error.stack : String(error);
    console.error('Error details:', errorDetails);
    
    // Return detailed error for debugging (remove sensitive info in production)
    const safeErrorMessage = errorMessage.includes('API key') 
      ? 'Translation service not configured. Please check your API keys in Supabase secrets.'
      : errorMessage;
    
    return new Response(JSON.stringify({ 
      error: safeErrorMessage || 'An unexpected error occurred during translation. Please try again.',
      details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function translateWithAI(
  userPrompt: string,
  systemPrompt: string,
  provider: string,
  apiKey: string
): Promise<string> {
  let result = '';
  const providerLower = provider.toLowerCase();
  
  console.log('Calling AI provider:', providerLower);
  
  try {
    switch (providerLower) {
      case 'huggingface':
        console.log('Using Hugging Face');
        result = await callHuggingFace(userPrompt, systemPrompt, apiKey);
        break;
      case 'groq':
        console.log('Using Groq');
        result = await callGroq(userPrompt, systemPrompt, apiKey);
        break;
      case 'together':
        console.log('Using Together AI');
        result = await callTogetherAI(userPrompt, systemPrompt, apiKey);
        break;
      case 'gemini':
        console.log('Using Gemini');
        result = await callGemini(userPrompt, systemPrompt, apiKey);
        break;
      default:
        throw new Error(`Unknown AI provider: ${provider}. Supported: huggingface, groq, together, gemini`);
    }
    
    console.log('AI provider response received, length:', result?.length || 0);
  } catch (error) {
    console.error('AI API error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      throw error;
    }
    throw new Error('AI service error');
  }
  
  if (!result || result.trim() === '') {
    console.error('Empty result from AI provider');
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
  console.log('Calling Groq API...');
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
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Groq API error:', response.status, errorText);
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    throw new Error(`Groq API error: ${response.status} - ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  console.log('Groq response length:', content.length);
  return content;
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
      model: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
      prompt: fullPrompt,
      max_tokens: 2000,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    throw new Error(`Together AI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.output?.choices?.[0]?.text || '';
}

async function callGemini(userPrompt: string, systemPrompt: string, apiKey: string): Promise<string> {
  // Use Gemini API v1 (newer, more reliable)
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `${systemPrompt}\n\n${userPrompt}`
        }]
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
