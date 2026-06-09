// Edge function: OCR exam grades from an uploaded image/PDF using Lovable AI (Gemini vision)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReqBody {
  imageBase64: string; // data URL or raw base64
  mimeType?: string;
  studentNames: string[];
  maxScore: number;
  examLabel?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, mimeType = "image/jpeg", studentNames, maxScore, examLabel = "الاختبار" }: ReqBody = await req.json();

    if (!imageBase64 || !studentNames?.length) {
      return new Response(JSON.stringify({ error: "missing imageBase64 or studentNames" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dataUrl = imageBase64.startsWith("data:") ? imageBase64 : `data:${mimeType};base64,${imageBase64}`;

    const namesList = studentNames.map((n, i) => `${i + 1}. ${n}`).join("\n");

    const systemPrompt = `أنت مساعد لاستخراج درجات الطلاب من صور كشوف الدرجات العربية.
- استخرج درجة "${examLabel}" لكل طالب من الصورة.
- الدرجة القصوى = ${maxScore}. لا تُرجع قيمة أكبر منها.
- طابِق الأسماء مع القائمة المعطاة (قد يوجد اختلاف بسيط بالكتابة، اختر الأقرب).
- إن لم تجد درجة لطالب، اتركه خارج النتائج.
- أرجع JSON فقط بدون أي شرح.`;

    const userText = `قائمة الطلاب المتوقعة:\n${namesList}\n\nاستخرج درجات "${examLabel}" (من ${maxScore}) من الصورة.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "submit_grades",
            description: "Submit extracted student grades",
            parameters: {
              type: "object",
              properties: {
                grades: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string", description: "اسم الطالب كما في القائمة" },
                      score: { type: "number", description: `الدرجة بين 0 و ${maxScore}` },
                    },
                    required: ["name", "score"],
                  },
                },
              },
              required: ["grades"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "submit_grades" } },
      }),
    });

    if (!aiRes.ok) {
      const errTxt = await aiRes.text();
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز حد الاستخدام مؤقتاً، حاول بعد قليل." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "نفد رصيد الذكاء الاصطناعي. أضف رصيداً من إعدادات Lovable Cloud." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI error", detail: errTxt }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall?.function?.arguments ? JSON.parse(toolCall.function.arguments) : { grades: [] };

    return new Response(JSON.stringify({ grades: args.grades ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
