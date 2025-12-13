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

interface FetchContentRequest {
  url: string;
  website?: string; // Optional website name for specific handling
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { url, website }: FetchContentRequest = await req.json();

    if (!url || typeof url !== 'string') {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the webpage
    console.log(`Fetching content from: ${url}`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();

    // Extract content based on website type or use general extraction
    let extractedContent = extractContent(html, website || parsedUrl.hostname);

    // Use AI to clean and structure the content if needed
    const aiProvider = Deno.env.get('AI_PROVIDER') || 'huggingface'; // huggingface, groq, together, gemini
    const aiApiKey = Deno.env.get('AI_API_KEY') || Deno.env.get('HUGGINGFACE_API_KEY');
    
    if (aiApiKey && extractedContent.text) {
      extractedContent = await enhanceContentWithAI(extractedContent, aiProvider, aiApiKey);
    }

    return new Response(
      JSON.stringify({
        success: true,
        title: extractedContent.title,
        content: extractedContent.text,
        metadata: extractedContent.metadata,
        source: url,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching content:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to fetch content' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

interface ExtractedContent {
  title: string;
  text: string;
  metadata: {
    author?: string;
    date?: string;
    language?: string;
    type?: string;
  };
}

function extractContent(html: string, website: string): ExtractedContent {
  // Remove scripts and styles
  let cleanHtml = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');

  // Extract title
  const titleMatch = cleanHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i) ||
                     cleanHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ||
                     cleanHtml.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
  const title = titleMatch ? stripHtml(titleMatch[1] || titleMatch[2] || '') : 'Untitled';

  // Extract main content - try different strategies
  let text = '';

  // Strategy 1: Look for common content containers
  const contentSelectors = [
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
    /<div[^>]*class=["'][^"']*content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*id=["'][^"']*content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class=["'][^"']*post[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class=["'][^"']*entry[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
  ];

  for (const selector of contentSelectors) {
    const match = cleanHtml.match(selector);
    if (match && match[1]) {
      text = stripHtml(match[1]);
      if (text.length > 100) break; // Found substantial content
    }
  }

  // Strategy 2: If no content found, extract all paragraphs
  if (text.length < 100) {
    const paragraphs = cleanHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
    if (paragraphs) {
      text = paragraphs
        .map(p => stripHtml(p))
        .filter(p => p.trim().length > 20)
        .join('\n\n');
    }
  }

  // Strategy 3: Fallback - extract all text
  if (text.length < 100) {
    text = stripHtml(cleanHtml);
  }

  // Extract metadata
  const metadata: ExtractedContent['metadata'] = {};
  
  // Try to find author
  const authorMatch = cleanHtml.match(/<meta[^>]*name=["']author["'][^>]*content=["']([^"']+)["']/i) ||
                       cleanHtml.match(/<span[^>]*class=["'][^"']*author[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
  if (authorMatch) {
    metadata.author = stripHtml(authorMatch[1] || '');
  }

  // Try to find date
  const dateMatch = cleanHtml.match(/<time[^>]*>([\s\S]*?)<\/time>/i) ||
                    cleanHtml.match(/<meta[^>]*property=["']article:published_time["'][^>]*content=["']([^"']+)["']/i);
  if (dateMatch) {
    metadata.date = stripHtml(dateMatch[1] || '');
  }

  // Detect language (basic detection)
  // Note: Kashmiri uses Perso-Arabic script like Urdu, so it will be detected as Arabic/Urdu
  // The frontend will handle more specific detection based on context
  if (text.match(/[\u0600-\u06FF]/)) {
    metadata.language = 'Arabic/Urdu/Kashmiri';
  } else if (text.match(/[\u4E00-\u9FFF]/)) {
    metadata.language = 'Chinese';
  } else {
    metadata.language = 'English';
  }

  metadata.type = 'poetry'; // Default, can be enhanced

  return {
    title: title.trim() || 'Untitled',
    text: text.trim(),
    metadata,
  };
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function enhanceContentWithAI(
  content: ExtractedContent,
  provider: string,
  apiKey: string
): Promise<ExtractedContent> {
  try {
    const prompt = `You are an expert in Islamic poetry and content. Analyze the following extracted content and:
1. Clean and format it properly
2. Identify if it's Naat, Noha, Dua, Manqabat, Marsiya, or other Islamic content
3. Extract the title if not clear
4. Remove any website navigation, ads, or irrelevant text
5. Preserve the poetic structure and line breaks
6. Return only the cleaned content in JSON format: {title: string, content: string, type: string}

Content to analyze:
${content.text.substring(0, 5000)}`;

    let aiResponse = '';
    
    switch (provider.toLowerCase()) {
      case 'huggingface':
        aiResponse = await callHuggingFace(prompt, apiKey);
        break;
      case 'groq':
        aiResponse = await callGroq(prompt, apiKey);
        break;
      case 'together':
        aiResponse = await callTogetherAI(prompt, apiKey);
        break;
      case 'gemini':
        aiResponse = await callGemini(prompt, apiKey);
        break;
      default:
        console.error('Unknown AI provider:', provider);
        return content;
    }

    if (!aiResponse) {
      return content;
    }
    
    try {
      const enhanced = JSON.parse(aiResponse);
      return {
        title: enhanced.title || content.title,
        text: enhanced.content || content.text,
        metadata: {
          ...content.metadata,
          type: enhanced.type || content.metadata.type,
        },
      };
    } catch {
      // If JSON parsing fails, return original
      return content;
    }
  } catch (error) {
    console.error('AI enhancement error:', error);
    return content; // Return original on error
  }
}

async function callHuggingFace(prompt: string, apiKey: string): Promise<string> {
  // Using Hugging Face Inference API - Free tier available
  const response = await fetch('https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3.1-8B-Instruct', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: 2000,
        temperature: 0.3,
        return_full_text: false,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Hugging Face API error: ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) && data[0]?.generated_text 
    ? data[0].generated_text 
    : data.generated_text || '';
}

async function callGroq(prompt: string, apiKey: string): Promise<string> {
  // Using Groq - Very fast, free tier available
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: 'You are an expert in Islamic poetry. Return only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callTogetherAI(prompt: string, apiKey: string): Promise<string> {
  // Using Together AI - Free credits available
  const response = await fetch('https://api.together.xyz/inference', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'meta-llama/Llama-3-8b-chat-hf',
      prompt: prompt,
      max_tokens: 2000,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error(`Together AI error: ${response.status}`);
  }

  const data = await response.json();
  return data.output?.choices?.[0]?.text || '';
}

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  // Using Google Gemini - Free tier available
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt,
        }],
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2000,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

