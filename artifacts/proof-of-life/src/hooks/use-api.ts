import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getExampleProject,
  getProjectBySlug,
  createProject,
  getProjectForEdit,
  updateProject,
  deleteProject,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  generateSummary,
  generateDemoScript,
  CreateProjectBody,
  UpdateProjectBody,
  MilestoneInput,
} from "@/lib/api";

export function useExampleProject() {
  return useQuery({
    queryKey: ["project", "example"],
    queryFn: getExampleProject,
  });
}

export function useProjectBySlug(slug: string) {
  return useQuery({
    queryKey: ["project", "slug", slug],
    queryFn: () => getProjectBySlug(slug),
    enabled: !!slug,
    retry: (failureCount, error: any) => {
      if (error?.status === 404) return false;
      return failureCount < 3;
    }
  });
}

export function useProjectForEdit(id: number | null, token: string | null) {
  return useQuery({
    queryKey: ["project", "edit", id],
    queryFn: () => getProjectForEdit(id!, token!),
    enabled: !!id && !!token,
    retry: (failureCount, error: any) => {
      if (error?.status === 401 || error?.status === 404) return false;
      return failureCount < 3;
    }
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateProjectBody) => createProject(body),
    onSuccess: (data) => {
      queryClient.setQueryData(["project", "edit", data.id], data);
    },
  });
}

export function useUpdateProject(id: number, token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateProjectBody) => updateProject(id, token, body),
    onSuccess: (data) => {
      queryClient.setQueryData(["project", "edit", id], data);
      queryClient.invalidateQueries({ queryKey: ["project", "slug", data.slug] });
    },
  });
}

function invalidateProjectViews(
  queryClient: ReturnType<typeof useQueryClient>,
  projectId: number,
) {
  queryClient.invalidateQueries({ queryKey: ["project", "edit", projectId] });
  // Invalidate every cached public-by-slug query so the public proof page
  // re-fetches after timeline/screenshot/publish changes.
  queryClient.invalidateQueries({
    predicate: (q) => q.queryKey[0] === "project" && q.queryKey[1] === "slug",
  });
  queryClient.invalidateQueries({ queryKey: ["project", "example"] });
}

export function useCreateMilestone(projectId: number, token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: MilestoneInput) => createMilestone(projectId, token, body),
    onSuccess: () => invalidateProjectViews(queryClient, projectId),
  });
}

export function useUpdateMilestone(projectId: number, token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ milestoneId, body }: { milestoneId: number; body: Partial<MilestoneInput> }) =>
      updateMilestone(projectId, milestoneId, token, body),
    onSuccess: () => invalidateProjectViews(queryClient, projectId),
  });
}

export function useDeleteMilestone(projectId: number, token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (milestoneId: number) => deleteMilestone(projectId, milestoneId, token),
    onSuccess: () => invalidateProjectViews(queryClient, projectId),
  });
}

export function useGenerateSummary(projectId: number, token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => generateSummary(projectId, token),
    onSuccess: (data) => {
      queryClient.setQueryData(["project", "edit", projectId], (old: any) => {
        if (!old) return old;
        return { ...old, generated_summary: data.generated_summary };
      });
    },
  });
}

export function useGenerateDemoScript(projectId: number, token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => generateDemoScript(projectId, token),
    onSuccess: (data) => {
      queryClient.setQueryData(["project", "edit", projectId], (old: any) => {
        if (!old) return old;
        return { ...old, generated_demo_script: data.generated_demo_script };
      });
    },
  });
}
