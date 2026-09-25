type ArcFeature = { attributes?: { PWSID?: string; PWS_Name?: string; Service_Area_Type?: string; Data_Provider_Type?: string } };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const zip = url.searchParams.get("zip");
  let latitude = Number(url.searchParams.get("lat"));
  let longitude = Number(url.searchParams.get("lon"));
  let place: string | null = null;
  let approximate = false;

  try {
    if (zip) {
      if (!/^\d{5}$/.test(zip)) return Response.json({ error: "Enter a valid five-digit US ZIP code." }, { status: 400 });
      const geoResponse = await fetch(`https://api.zippopotam.us/us/${zip}`, { signal: AbortSignal.timeout(8000) });
      if (geoResponse.status === 404) return Response.json({ error: "We could not find that ZIP code." }, { status: 404 });
      if (!geoResponse.ok) throw new Error("ZIP lookup unavailable");
      const geo = await geoResponse.json() as { places?: Array<{ latitude: string; longitude: string; "place name": string; "state abbreviation": string }> };
      const first = geo.places?.[0];
      if (!first) throw new Error("ZIP location unavailable");
      latitude = Number(first.latitude);
      longitude = Number(first.longitude);
      place = `${first["place name"]}, ${first["state abbreviation"]}`;
      approximate = true;
    }
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < 18 || latitude > 72 || longitude < -180 || longitude > -60) {
      return Response.json({ error: "Enter a US ZIP code or share a US location." }, { status: 400 });
    }

    const query = new URL("https://services.arcgis.com/cJ9YHowT8TU7DUyn/ArcGIS/rest/services/Water_System_Boundaries/FeatureServer/0/query");
    query.search = new URLSearchParams({
      f: "json", where: "1=1", geometry: `${longitude},${latitude}`, geometryType: "esriGeometryPoint",
      inSR: "4326", spatialRel: "esriSpatialRelIntersects",
      outFields: "PWSID,PWS_Name,Service_Area_Type,Data_Provider_Type", returnGeometry: "false",
      resultRecordCount: "12",
    }).toString();
    const response = await fetch(query, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error("EPA service unavailable");
    const data = await response.json() as { features?: ArcFeature[]; error?: unknown };
    if (data.error) throw new Error("EPA service unavailable");
    const seen = new Set<string>();
    const suppliers = (data.features ?? []).map((feature) => feature.attributes).filter((item) => {
      if (!item?.PWSID || seen.has(item.PWSID)) return false;
      seen.add(item.PWSID); return true;
    }).map((item) => ({
      id: item!.PWSID!, name: item!.PWS_Name ?? "Unnamed public water system",
      areaType: item!.Service_Area_Type ?? null, providerType: item!.Data_Provider_Type ?? null,
    }));
    return Response.json({ suppliers, place, approximate, source: "US EPA public water system service areas, version 3 (2026)" });
  } catch {
    return Response.json({ error: "The water-supplier lookup is temporarily unavailable. You can still enter your measured hardness below." }, { status: 503 });
  }
}
