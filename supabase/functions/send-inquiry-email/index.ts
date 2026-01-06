import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPPORT_EMAIL = "skdud4659@gmail.com";

interface InquiryEmailData {
  category: string;
  title: string;
  content: string;
  userEmail: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // CORS preflight 요청 처리
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const { category, title, content, userEmail }: InquiryEmailData = await req.json();

    if (!category || !title || !content || !userEmail) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; border-bottom: 2px solid #4F46E5; padding-bottom: 10px;">
          📩 새로운 문의가 접수되었습니다
        </h2>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>문의 유형:</strong> ${category}</p>
          <p style="margin: 5px 0;"><strong>사용자 이메일:</strong> ${userEmail}</p>
          <p style="margin: 5px 0;"><strong>제목:</strong> ${title}</p>
        </div>

        <div style="margin: 20px 0;">
          <h3 style="color: #333;">문의 내용</h3>
          <div style="background-color: #fff; border: 1px solid #e0e0e0; padding: 15px; border-radius: 8px; white-space: pre-wrap;">
${content}
          </div>
        </div>

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;" />
        <p style="color: #888; font-size: 12px;">
          이 이메일은 예산 플래너 앱에서 자동으로 발송되었습니다.
        </p>
      </div>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "예산 플래너 <onboarding@resend.dev>",
        to: [SUPPORT_EMAIL],
        subject: `[예산 플래너 문의] [${category}] ${title}`,
        html: emailHtml,
        reply_to: userEmail,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", result);
      throw new Error(result.message || "Failed to send email");
    }

    return new Response(
      JSON.stringify({ success: true, messageId: result.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
