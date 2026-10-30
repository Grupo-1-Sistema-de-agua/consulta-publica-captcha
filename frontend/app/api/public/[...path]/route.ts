export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function proxy(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const operation = path.join("/");
  const isCaptchaRequest = operation === "captcha" && request.method === "GET";
  const isConsultationRequest = operation === "consult" && request.method === "POST";

  if (!isCaptchaRequest && !isConsultationRequest) {
    return Response.json({ message: "Ruta o método no permitido." }, { status: 404 });
  }

  const backendUrl = process.env.API_URL ?? "http://localhost:8080";
  const upstreamUrl = new URL(`/api/public/${operation}`, backendUrl);
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }

  const response = await fetch(upstreamUrl, {
    method: request.method,
    headers,
    body: isConsultationRequest ? await request.text() : undefined,
    cache: "no-store",
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": response.headers.get("content-type") ?? "application/json",
    },
  });
}

export const GET = proxy;
export const POST = proxy;
