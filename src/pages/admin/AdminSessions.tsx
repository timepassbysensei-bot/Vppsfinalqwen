// Admin Academic Sessions: create/edit sessions and mark the running one active.
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, CheckCircle2, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/format";
import { Button, Card, EmptyState, Field, Input, Modal, Spinner, Badge, ConfirmDialog } from "@/components/ui";
import type { AcademicSession } from "@/types/database";

interface FormState {
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

const EMPTY: FormState = { name: "", start_date: "", end_date: "", is_active: true };

export default function AdminSessions() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AcademicSession | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<AcademicSession | null>(null);

  const { data: sessions, isLoading, isError, error: loadError } = useQuery({
    queryKey: ["admin_sessions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("academic_sessions").select("*").order("start_date", { ascending: false });
      if (error) throw error;
      return data as AcademicSession[];
    },
  });

  function openCreate() {
    setForm(EMPTY);
    setError("");
    setCreating(true);
  }

  function openEdit(s: AcademicSession) {
    setForm({
      name: s.name,
      start_date: s.start_date ?? "",
      end_date: s.end_date ?? "",
      is_active: s.is_active,
    });
    setError("");
    setEditing(s);
  }

  const save = useMutation({
    mutationFn: async ({ values, id }: { values: FormState; id?: string }) => {
      if (values.name.trim().length < 3) throw new Error("Give the session a name, e.g. 2026-27");
      const payload = {
        name: values.name.trim(),
        start_date: values.start_date || null,
        end_date: values.end_date || null,
        is_active: values.is_active,
      };
      if (id) {
        const { error } = await supabase.from("academic_sessions").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("academic_sessions").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.id ? "Session updated" : "Session created");
      qc.invalidateQueries({ queryKey: ["admin_sessions"] });
      setCreating(false);
      setEditing(null);
    },
    onError: (e: any) => setError(e.message ?? "Could not save the session"),
  });

  const activate = useMutation({
    mutationFn: async (s: AcademicSession) => {
      const { error } = await supabase.from("academic_sessions").update({ is_active: true }).eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Session marked as active");
      qc.invalidateQueries({ queryKey: ["admin_sessions"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (s: AcademicSession) => {
      const { error } = await supabase.from("academic_sessions").delete().eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Session removed");
      qc.invalidateQueries({ queryKey: ["admin_sessions"] });
      setConfirmDelete(null);
    },
    onError: (e: any) => {
      toast.error(e.message ?? "Could not delete — batches may still reference this session");
      setConfirmDelete(null);
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold sm:text-2xl">Academic Sessions</h1>
          <p className="mt-0.5 text-sm text-muted">Sessions group batches and tests by academic year.</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" aria-hidden /> New Session</Button>
      </div>

      {isLoading ? (
        <Spinner label="Loading sessions…" />
      ) : isError ? (
        <div className="card p-5 text-sm text-error" role="alert">{(loadError as Error)?.message ?? "Could not load sessions."}</div>
      ) : !sessions?.length ? (
        <EmptyState
          title="No academic sessions yet"
          description="Create a session such as “2026-27” so batches, tests and results can be grouped."
          action={<Button onClick={openCreate}>New Session</Button>}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-offwhite">
                <tr>
                  <th className="table-th">Session</th>
                  <th className="table-th">Dates</th>
                  <th className="table-th">Status</th>
                  <th className="table-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lightgray">
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td className="table-td font-medium text-navy">{s.name}</td>
                    <td className="table-td">
                      {formatDate(s.start_date)} – {formatDate(s.end_date)}
                    </td>
                    <td className="table-td">
                      {s.is_active ? <Badge tone="green">Active</Badge> : <Badge tone="gray">Inactive</Badge>}
                    </td>
                    <td className="table-td">
                      <div className="flex justify-end gap-1">
                        {!s.is_active ? (
                          <Button variant="ghost" size="sm" onClick={() => activate.mutate(s)} aria-label={`Mark ${s.name} active`}>
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                        <Button variant="ghost" size="sm" onClick={() => openEdit(s)} aria-label={`Edit ${s.name}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(s)} aria-label={`Delete ${s.name}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={creating || !!editing} onClose={() => { setCreating(false); setEditing(null); }} title={editing ? "Edit Session" : "New Session"}>
        <form
          className="space-y-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate({ values: form, id: editing?.id });
          }}
        >
          <Field label="Session name" required hint="For example: 2026-27">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start date"><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></Field>
            <Field label="End date"><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 rounded border-lightgray text-navy" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            This is the running session
          </label>
          {error ? <p className="error-text" role="alert">{error}</p> : null}
          <div className="flex justify-end gap-2 border-t border-lightgray pt-4">
            <Button type="button" variant="outline" onClick={() => { setCreating(false); setEditing(null); }}>Cancel</Button>
            <Button type="submit" loading={save.isPending}>Save Session</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && remove.mutate(confirmDelete)}
        title="Delete session"
        message={`Delete “${confirmDelete?.name}”? This cannot be undone and will fail if batches or tests still reference it.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
