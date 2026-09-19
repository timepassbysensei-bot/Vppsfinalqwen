// Admin Inquiries: admission-lead CRM — search, pipeline status, follow-up dates,
// private notes, one-tap call/WhatsApp and CSV export.
import { useCallback, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Inbox, Phone, MessageCircle, Search, Download, Save, UserCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDateTime, formatDate, downloadText, toCsv, telLink, waLink } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { Button, Card, EmptyState, Field, Input, Modal, Pagination, Select, Spinner, Badge, Textarea } from "@/components/ui";
import type { Inquiry, InquiryStatus } from "@/types/database";

const PAGE_SIZE = 15;

const STATUSES: { value: InquiryStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "interested", label: "Interested" },
  { value: "follow_up", label: "Follow-up" },
  { value: "admitted", label: "Admitted" },
  { value: "closed", label: "Closed" },
  { value: "spam", label: "Spam" },
];

const STATUS_TONE: Record<InquiryStatus, "green" | "amber" | "gray" | "navy" | "red"> = {
  new: "amber", contacted: "navy", interested: "navy", follow_up: "amber",
  admitted: "green", closed: "gray", spam: "red",
};

export default function AdminInquiries() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<Inquiry | null>(null);
  const [draft, setDraft] = useState<{ status: InquiryStatus; follow_up_date: string; internal_notes: string }>({
    status: "new", follow_up_date: "", internal_notes: "",
  });

  const { data: inquiries, isLoading, isError, error } = useQuery({
    queryKey: ["admin_inquiries", statusFilter],
    queryFn: async () => {
      let query = supabase.from("inquiries").select("*").order("created_at", { ascending: false }).limit(500);
      if (statusFilter) query = query.eq("status", statusFilter as InquiryStatus);
      const { data, error } = await query;
      if (error) throw error;
      return data as Inquiry[];
    },
  });

  const filtered = useMemo(() => {
    const list = inquiries ?? [];
    if (!q.trim()) return list;
    const t = q.trim().toLowerCase();
    return list.filter((i) =>
      i.name.toLowerCase().includes(t) ||
      i.phone.includes(t) ||
      (i.email ?? "").toLowerCase().includes(t) ||
      (i.interested_course ?? "").toLowerCase().includes(t) ||
      (i.city ?? "").toLowerCase().includes(t),
    );
  }, [inquiries, q]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openInquiry(i: Inquiry) {
    setDraft({ status: i.status, follow_up_date: i.follow_up_date ?? "", internal_notes: i.internal_notes ?? "" });
    setOpen(i);
  }

  const saveNotes = useMutation({
    mutationFn: async (i: Inquiry) => {
      const { error } = await supabase.from("inquiries").update({
        status: draft.status,
        follow_up_date: draft.follow_up_date || null,
        internal_notes: draft.internal_notes.trim() || null,
      }).eq("id", i.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Inquiry updated");
      qc.invalidateQueries({ queryKey: ["admin_inquiries"] });
      setOpen(null);
    },
    onError: (e: any) => toast.error(e.message ?? "Could not update the inquiry"),
  });

  const assignToMe = useMutation({
    mutationFn: async (i: Inquiry) => {
      const { error } = await supabase.from("inquiries").update({ assigned_to: user?.id ?? null }).eq("id", i.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Assigned to you");
      qc.invalidateQueries({ queryKey: ["admin_inquiries"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const quickStatus = useMutation({
    mutationFn: async ({ i, status }: { i: Inquiry; status: InquiryStatus }) => {
      const { error } = await supabase.from("inquiries").update({ status }).eq("id", i.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Status updated"); qc.invalidateQueries({ queryKey: ["admin_inquiries"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const exportCsv = useCallback(() => {
    downloadText(
      `inquiries-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(
        ["Name", "Phone", "WhatsApp", "Email", "City", "Interested course", "Preferred batch", "Status", "Follow-up", "Received"],
        filtered.map((i) => [
          i.name, i.phone, i.whatsapp ?? "", i.email ?? "", i.city ?? "",
          i.interested_course ?? "", i.preferred_batch ?? "", i.status,
          formatDate(i.follow_up_date), formatDateTime(i.created_at),
        ]),
      ),
    );
    toast.success("Inquiries exported");
  }, [filtered]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold sm:text-2xl">Inquiries</h1>
          <p className="mt-0.5 text-sm text-muted">Leads from the website forms. Private notes are never shown publicly.</p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={!filtered.length}>
          <Download className="h-4 w-4" aria-hidden /> Export CSV
        </Button>
      </div>

      <Card className="grid gap-3 p-4 sm:grid-cols-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search name, phone, course…" className="pl-9" aria-label="Search inquiries" />
        </div>
        <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} aria-label="Filter by status">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Select>
        <p className="self-center text-xs text-muted">{filtered.length} inquiry(ies)</p>
      </Card>

      {isLoading ? (
        <Spinner label="Loading inquiries…" />
      ) : isError ? (
        <div className="card p-5 text-sm text-error" role="alert">{(error as Error)?.message ?? "Could not load inquiries."}</div>
      ) : pageItems.length === 0 ? (
        <EmptyState
          title="No inquiries found"
          description="Submissions from the Admissions and Contact pages appear here as soon as a visitor sends the form."
        />
      ) : (
        <>
          <Card className="hidden overflow-hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-offwhite">
                  <tr>
                    <th className="table-th">Applicant</th>
                    <th className="table-th">Interest</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Follow-up</th>
                    <th className="table-th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-lightgray">
                  {pageItems.map((i) => (
                    <tr key={i.id}>
                      <td className="table-td">
                        <button onClick={() => openInquiry(i)} className="font-medium text-navy hover:underline">{i.name}</button>
                        <p className="text-xs text-muted">{i.phone} · {i.city ?? "—"}</p>
                      </td>
                      <td className="table-td">
                        <p>{i.interested_course ?? "General"}</p>
                        <p className="text-xs text-muted">{formatDateTime(i.created_at)}</p>
                      </td>
                      <td className="table-td"><Badge tone={STATUS_TONE[i.status]}>{i.status.replace("_", " ")}</Badge></td>
                      <td className="table-td">{formatDate(i.follow_up_date)}</td>
                      <td className="table-td">
                        <div className="flex justify-end gap-1">
                          <a href={telLink(i.phone)} className="btn-outline btn-sm" aria-label={`Call ${i.name}`}><Phone className="h-3.5 w-3.5" /></a>
                          <a href={waLink(i.whatsapp || i.phone, `Hello ${i.name}, regarding your inquiry to Bokaro Defence Academy`)} target="_blank" rel="noopener noreferrer" className="btn-outline btn-sm" aria-label={`WhatsApp ${i.name}`}><MessageCircle className="h-3.5 w-3.5" /></a>
                          <Button variant="ghost" size="sm" onClick={() => openInquiry(i)}>Open</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 pb-4"><Pagination page={page} pageCount={pageCount} onChange={setPage} /></div>
          </Card>

          {/* Mobile cards */}
          <div className="space-y-3 lg:hidden">
            {pageItems.map((i) => (
              <Card key={i.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <button onClick={() => openInquiry(i)} className="text-left font-semibold text-navy">{i.name}</button>
                    <p className="text-xs text-muted">{i.interested_course ?? "General inquiry"} · {i.city ?? "—"}</p>
                  </div>
                  <Badge tone={STATUS_TONE[i.status]}>{i.status.replace("_", " ")}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted">{i.phone}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <a href={telLink(i.phone)} className="btn-outline btn-sm">Call</a>
                  <a href={waLink(i.whatsapp || i.phone)} target="_blank" rel="noopener noreferrer" className="btn-outline btn-sm">WhatsApp</a>
                  <Button variant="outline" size="sm" onClick={() => openInquiry(i)}>Open</Button>
                </div>
              </Card>
            ))}
            <Pagination page={page} pageCount={pageCount} onChange={setPage} />
          </div>
        </>
      )}

      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.name ?? "Inquiry"} wide>
        {open ? (
          <div className="space-y-4">
            <div className="grid gap-3 rounded-md bg-offwhite p-4 text-sm sm:grid-cols-2">
              <p><span className="text-muted">Phone:</span> {open.phone}</p>
              <p><span className="text-muted">WhatsApp:</span> {open.whatsapp ?? "—"}</p>
              <p><span className="text-muted">Email:</span> {open.email ?? "—"}</p>
              <p><span className="text-muted">City:</span> {open.city ?? "—"}</p>
              <p><span className="text-muted">Interested course:</span> {open.interested_course ?? "—"}</p>
              <p><span className="text-muted">Preferred batch:</span> {open.preferred_batch ?? "—"}</p>
              <p className="sm:col-span-2"><span className="text-muted">Received:</span> {formatDateTime(open.created_at)}</p>
              {open.source_page ? <p className="sm:col-span-2"><span className="text-muted">Source page:</span> {open.source_page}</p> : null}
              {open.utm_source || open.utm_campaign ? (
                <p className="sm:col-span-2"><span className="text-muted">Campaign:</span> {[open.utm_source, open.utm_medium, open.utm_campaign].filter(Boolean).join(" / ")}</p>
              ) : null}
            </div>

            {open.message ? (
              <div>
                <p className="label">Message from the applicant</p>
                <p className="whitespace-pre-line rounded-md border border-lightgray p-3 text-sm">{open.message}</p>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Status">
                <Select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as InquiryStatus })}>
                  {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </Select>
              </Field>
              <Field label="Follow-up date"><Input type="date" value={draft.follow_up_date} onChange={(e) => setDraft({ ...draft, follow_up_date: e.target.value })} /></Field>
            </div>
            <Field label="Private notes" hint="Only staff can see this">
              <Textarea rows={3} value={draft.internal_notes} onChange={(e) => setDraft({ ...draft, internal_notes: e.target.value })} />
            </Field>

            <div className="flex flex-wrap gap-2 border-t border-lightgray pt-4">
              <a href={telLink(open.phone)} className="btn-outline btn-sm"><Phone className="h-3.5 w-3.5" aria-hidden /> Call</a>
              <a href={waLink(open.whatsapp || open.phone, `Hello ${open.name}, regarding your inquiry to Bokaro Defence Academy`)} target="_blank" rel="noopener noreferrer" className="btn-outline btn-sm">
                <MessageCircle className="h-3.5 w-3.5" aria-hidden /> WhatsApp
              </a>
              <Button variant="outline" size="sm" onClick={() => assignToMe.mutate(open)}><UserCheck className="h-3.5 w-3.5" aria-hidden /> Assign to me</Button>
              <Button variant="outline" size="sm" onClick={() => quickStatus.mutate({ i: open, status: "admitted" })}>Mark admitted</Button>
              <div className="ml-auto flex gap-2">
                <Button variant="outline" onClick={() => setOpen(null)}>Close</Button>
                <Button onClick={() => saveNotes.mutate(open)} loading={saveNotes.isPending}><Save className="h-4 w-4" aria-hidden /> Save</Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted"><Inbox className="h-4 w-4" aria-hidden /> No inquiry selected.</div>
        )}
      </Modal>
    </div>
  );
}
