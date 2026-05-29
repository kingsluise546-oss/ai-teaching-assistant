export async function callAI(params: {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
}): Promise<string> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "system", content: params.system },
        ...params.messages,
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "请求失败");
  }

  const data = await res.json();
  return data.choices[0].message.content;
}
