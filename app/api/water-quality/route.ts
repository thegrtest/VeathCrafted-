type EchoSystem = {
  PWSId?: string;
  PWSName?: string;
  PrimarySourceDesc?: string | null;
  QtrsWithVio?: string | null;
  DfrUrl?: string | null;
};

type EchoResults = {
  Results?: {
    QueryID?: string;
    WaterSystems?: EchoSystem[];
    Error?: { ErrorMessage?: string };
  };
};

const echoBase = "https://echodata.epa.gov/echo/";

async function getEcho(path: string, params: URLSearchParams): Promise<EchoResults> {
  const response = await fetch(`${echoBase}${path}?${params}`, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error("EPA ECHO unavailable");
  const data = await response.json() as EchoResults;
  if (data.Results?.Error) throw new Error("EPA ECHO query failed");
  return data;
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("pwsid")?.toUpperCase() ?? "";
  if (!/^[A-Z]{2}\d{7}$/.test(id)) {
    return Response.json({ error: "Enter a valid public water system ID." }, { status: 400 });
  }

  try {
    const search = await getEcho("sdw_rest_services.get_systems", new URLSearchParams({ output: "JSON", p_pid: id }));
    const queryId = search.Results?.QueryID;
    if (!queryId || !/^\d+$/.test(queryId)) throw new Error("EPA ECHO query unavailable");
    const result = await getEcho("sdw_rest_services.get_qid", new URLSearchParams({ output: "JSON", qid: queryId }));
    const system = result.Results?.WaterSystems?.find((item) => item.PWSId === id);
    if (!system) return Response.json({ error: "No EPA quality record was found for this system." }, { status: 404 });

    const quarters = system.QtrsWithVio === null || system.QtrsWithVio === undefined ? null : Number(system.QtrsWithVio);
    const detailedReport = system.DfrUrl?.startsWith("https://echo.epa.gov/detailed-facility-report?") ? system.DfrUrl : null;
    return Response.json({
      id,
      name: system.PWSName ?? null,
      sourceWater: system.PrimarySourceDesc ?? null,
      quartersWithViolations: quarters !== null && Number.isInteger(quarters) && quarters >= 0 ? quarters : null,
      detailedReport,
      source: "US EPA ECHO / Safe Drinking Water Information System",
    }, { headers: { "Cache-Control": "public, max-age=3600" } });
  } catch {
    return Response.json({ error: "EPA quality data is temporarily unavailable. Check the utility report instead." }, { status: 503 });
  }
}
