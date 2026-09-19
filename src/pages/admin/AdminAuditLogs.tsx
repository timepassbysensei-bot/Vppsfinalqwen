// Admin Audit Logs: append-only record of privileged changes (tests, roles, …).
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/format";
import { Card, EmptyState, Input, Pagination, Select, Spinner, Badge } from "@/components/ui";
import type { AuditLog } from "@/types/database";

const PAGE_SIZE = 25;

const ENTITY_OPTIONS = [
  "tests", "user_roles", "students", "teachers", "courses", "batches",
  "notices", "achievements", "testimonials", "inquiries",
];

export default function AdminAuditLogs() {
  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const { data: logs, isLoading, isError, error } = useQuery({
    queryKey: ["admin_audit_logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as AuditLog[];
    },
  });

  const filtered = useMemo(() => {
    return (logs ?? []).filter((l) => {
      if (entity && l.entity !== entity) return false;
      if (action && l.action !== action) return false;
      if (q.trim()) {
        const t = q.trim().toLowerCase();
        return l.entity_id?.toLowerCase().includes(t) || JSON.stringify(l.details).toLowerCase().includes(t);
      }
      return true;
    });
  }, [logs, entity, action, q]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const actionTone = (a: string) =>
    a === "DELETE" ? "red" : a === "INSERT" ? "green" : a === "PUBLISHED_TEST_EDITED" ? "amber" : "navy";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-xl font-bold sm:text-2xl">Audit Logs</h1>
        <p className="mt-0.5 text-sm text-muted">
          Append-only history of sensitive changes. Logs cannot be edited or deleted from the dashboard.
        </p>
      </div>

      <Card className="grid gap-3 p-4 sm:grid-cols-3">
        <Select value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }} aria-label="Filter by record type">
          <option value="">All record types</option>
          {ENTITY_OPTIONS.map((x) => <option key={x} value={x}>{x}</option>)}
        </Select>
        <Select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} aria-label="Filter by action">
          <option value="">All actions</option>
          <option value="INSERT">Insert</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
          <option value="PUBLISHED_TEST_EDITED">Published test edited</option>
        </Select>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search record ID…" className="pl-9" aria-label="Search logs" />
        </div>
      </Card>

      {isLoading ? (
        <Spinner label="Loading audit logs…" />
      ) : isError ? (
        <div className="card p-5 text-sm text-error" role="alert">
          {(error as Error)?.message ?? "Could not load audit logs."} Only admins can read audit logs.
        </div>
      ) : pageItems.length === 0 ? (
        <EmptyState
          title="No audit entries"
          description="Role changes and edits to published tests will be recorded here automatically."
        />
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-offwhite">
                  <tr>
                    <th className="table-th">When</th>
                    <th className="table-th">Action</th>
                    <th className="table-th">Record</th>
                    <th className="table-th">Record ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-lightgray">
                  {pageItems.map((l) => (
                    <tr key={l.id}>
                      <td className="table-td whitespace-nowrap text-xs text-muted">{formatDateTime(l.created_at)}</td>
                      <td className="table-td"><Badge tone={actionTone(l.action) as any}>{l.action}</Badge></td>
                      <td className="table-td font-medium text-navy">{l.entity}</td>
                      <td className="table-td font-mono text-xs">{l.entity_id ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 pb-4"><Pagination page={page} pageCount={pageCount} onChange={setPage} /></div>
          </Card>

          <p className="flex items-center gap-1.5 text-xs text-muted">
            <ScrollText className="h-3.5 w-3.5" aria-hidden />
            Showing {pageItems.length} of {filtered.length} entries (most recent 500 loaded).
          </p>
        </>
      )}
    </div>
  );
}
