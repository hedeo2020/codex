import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (!lat || !lon) {
    return NextResponse.json({ error: "Latitude and longitude are required." }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&zoom=18&addressdetails=1`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "ClockwiseAttendance/1.0"
        },
        cache: "no-store"
      }
    );

    if (!response.ok) {
      return NextResponse.json({ locationLabel: "Current area" });
    }

    const payload = (await response.json()) as {
      name?: string;
      address?: Record<string, string | undefined>;
    };
    const address = payload.address ?? {};
    const locationLabel =
      address.road ||
      address.neighbourhood ||
      address.suburb ||
      address.village ||
      address.town ||
      address.city ||
      payload.name ||
      "Current area";

    return NextResponse.json({ locationLabel });
  } catch {
    return NextResponse.json({ locationLabel: "Current area" });
  }
}
