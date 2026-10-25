interface DashboardDatabase {
  prepare(query: string): {
    first<T>(): Promise<T | null>;
  };
}

export async function dashboardResponse(
  db: DashboardDatabase,
  headers: Record<string, string> = {},
): Promise<Response> {
  async function query<T>(table: string, sql: string): Promise<T | null> {
    try {
      return await db.prepare(sql).first<T>();
    } catch (error) {
      console.error(JSON.stringify({
        endpoint: "/api/dashboard",
        query: sql,
        table,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }));
      throw error;
    }
  }

  try {
    const products = await query<{
      projects: number;
      activeProducts: number;
      readyToPublish: number;
    }>("products", `
      SELECT COUNT(*) AS projects,
             COALESCE(SUM(stage = 'Live'), 0) AS activeProducts,
             COALESCE(SUM(stage = 'Ready'), 0) AS readyToPublish
      FROM products
    `);
    const approvals = await query<{ approvals: number }>("approvals", `
      SELECT COUNT(*) AS approvals
      FROM approvals
      WHERE status = 'pending'
    `);

    let health = 100;
    try {
      const result = await query<{ health: number | null }>("virtual_processes", `
        SELECT ROUND(
          100.0 * SUM(state IN ('READY', 'RUNNING', 'SUSPENDED'))
          / NULLIF(COUNT(*), 0)
        ) AS health
        FROM virtual_processes
      `);
      health = result?.health ?? 100;
    } catch {
      // Process telemetry is optional; the failed query was logged above.
    }

    return Response.json({
      ...(products ?? {}),
      ...(approvals ?? {}),
      health,
    }, { headers });
  } catch {
    return Response.json({ error: "Portal data is unavailable" }, {
      status: 500,
      headers,
    });
  }
}
