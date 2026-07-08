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
    const barangay =
      address.suburb ||
      address.neighbourhood ||
      address.quarter ||
      address.hamlet ||
      address.city_district ||
      "Barangay unavailable";
    const cityMunicipality =
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      "City/Municipality unavailable";
    const country = address.country || "Country unavailable";
    const locationLabel = `${barangay},${cityMunicipality},${country}`;

    return NextResponse.json({ locationLabel });
  } catch {
    return NextResponse.json({ locationLabel: "Current area" });
  }
}
