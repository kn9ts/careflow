import { NextResponse } from "next/server";

export function successResponse(data = {}, options = {}) {
  const { status = 200, headers } = options;
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status, headers },
  );
}

export function errorResponse(message, options = {}) {
  const { status = 500, code = "INTERNAL_ERROR", details } = options;
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
        code,
        details,
      },
    },
    { status },
  );
}

export function handleAuthResult(authResult) {
  if (authResult?.success) {
    return null;
  }
  return errorResponse(authResult?.error || "Unauthorized", {
    status: authResult?.status || 401,
    code: "UNAUTHORIZED",
  });
}
