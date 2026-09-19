// Resolves what a signed-in teacher is allowed to work with.
// Row Level Security already blocks unauthorised rows, but a teacher can *see*
// every batch (staff read policy), so the dashboard filters the pickers down to
// their assigned batches to avoid confusing, failing submissions.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export interface ScopedBatch {
  id: string;
  name: string;
  course_id: string;
  timing: string | null;
  courses?: { title: string } | null;
}

export interface TeacherScope {
  teacher: { id: string; full_name: string; can_publish_results: boolean } | null;
  batches: ScopedBatch[];
  courses: { id: string; title: string }[];
  subjectIds: string[];
  allowedBatchIds: string[];
}

export function useTeacherScope() {
  const { user } = useAuth();
  return useQuery<TeacherScope>({
    queryKey: ["teacher_scope", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: teacher, error: teacherError } = await supabase
        .from("teachers")
        .select("id,full_name,can_publish_results")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (teacherError) throw teacherError;
      if (!teacher) return { teacher: null, batches: [], courses: [], subjectIds: [], allowedBatchIds: [] };

      const [assignmentRes, batchRes] = await Promise.all([
        supabase.from("teacher_assignments").select("course_id,batch_id,subject_id").eq("teacher_id", teacher.id),
        supabase
          .from("batches")
          .select("id,name,course_id,timing,teacher_id,courses(title)")
          .is("archived_at", null)
          .order("name"),
      ]);

      const assignments = (assignmentRes.data ?? []) as { course_id: string | null; batch_id: string | null; subject_id: string | null }[];
      // Embedded joins are not described by the hand-written Database types, so
      // the row shape is asserted here (PostgREST returns the joined object).
      const allBatches = (batchRes.data ?? []) as unknown as (ScopedBatch & { teacher_id: string | null })[];

      const batches = allBatches.filter((b) =>
        b.teacher_id === teacher.id ||
        assignments.some((a) => a.batch_id === b.id || (a.batch_id === null && a.course_id === b.course_id)),
      );

      const courseMap = new Map<string, string>();
      batches.forEach((b) => {
        if (b.course_id) courseMap.set(b.course_id, b.courses?.title ?? "Course");
      });

      return {
        teacher: { id: teacher.id, full_name: teacher.full_name, can_publish_results: teacher.can_publish_results },
        batches,
        courses: Array.from(courseMap.entries()).map(([id, title]) => ({ id, title })),
        subjectIds: Array.from(new Set(assignments.map((a) => a.subject_id).filter((s): s is string => !!s))),
        allowedBatchIds: batches.map((b) => b.id),
      };
    },
    staleTime: 60_000,
  });
}
