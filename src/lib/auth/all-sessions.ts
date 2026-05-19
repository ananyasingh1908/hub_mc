import { getHubMCSession } from "./session";
import { getEmployeeSession } from "./employee-session";
import { getAdminSession } from "./admin-session";

export async function handleAllSessionsRequest(request: Request): Promise<Response> {
  const [customer, employee, admin] = await Promise.all([
    getHubMCSession(request),
    getEmployeeSession(request),
    getAdminSession(request),
  ]);
  return Response.json({ customer, employee, admin });
}
