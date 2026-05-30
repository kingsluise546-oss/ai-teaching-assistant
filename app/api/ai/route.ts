import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "DEEPSEEK_API_KEY 未配置" }, { status: 500 });
  }

  // ── 基础限流：每 IP 每分钟最多 15 次 ──
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const limit = checkRateLimit(ip, 15, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `请求过于频繁，请 ${limit.retryAfter} 秒后重试` },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfter) },
      }
    );
  }

  try {
    const body = await req.json();

    // 安全：仅提取 messages，禁止客户端篡改 model/temperature/max_tokens
    const { messages } = body;
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "缺少 messages 参数" }, { status: 400 });
    }

    // 动态 max_tokens：根据请求内容估算
    // 系统提示词长度 > 2000 字符 → 可能包含阅读材料，给 8192
    const sysContent = typeof messages[0]?.content === "string" ? messages[0].content : "";
    const maxTokens = sysContent.length > 2000 ? 8192 : 4096;

    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        temperature: 0.7,
        max_tokens: maxTokens,
        messages,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `DeepSeek API: ${err}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
