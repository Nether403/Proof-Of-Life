import { useQuery, useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
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
  ApiError,
  type Project,
  type ProjectWithToken,
  type CreateProjectBody,
  type UpdateProjectBody,
  type MilestoneInput,
} from "@/lib/api";

function statusOf(error: unknown): number | undefined {
  return error instanceof ApiError ? error.status : undefined;
}

export function useExampleProject() {
  return useQuery<Project, ApiError>({
    queryKey: ["project", "example"],
    queryFn: getExampleProject,
  });
}

export function useProjectBySlug(slug: string) {
  return useQuery<Project, ApiError>({
    queryKey: ["project", "slug", slug],
    queryFn: () => getProjectBySlug(slug),
    enabled: !!slug,
    retry: (failureCount, error) => {
      if (statusOf(error) === 404) return false;
      return failureCount < 3;
    },
  });
}

export function useProjectForEdit(id: number | null, token: string | null) {
  return useQuery<ProjectWithToken, ApiError>({
    queryKey: ["project", "edit", id],
    queryFn: () => getProjectForEdit(id!, token!),
    enabled: !!id && !!token,
    retry: (failureCount, error) => {
      const s = statusOf(error);
      if (s === 401 || s === 404) return false;
      return failureCount < 3;
    },
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation<ProjectWithToken, ApiError, CreateProjectBody>({
    mutationFn: (body) => createProject(body),
    onSuccess: (data) => {
      queryClient.setQueryData(["project", "edit", data.id], data);
    },
  });
}

export function useUpdateProject(id: number, token: string) {
  const queryClient = useQueryClient();
  return useMutation<ProjectWithToken, ApiError, UpdateProjectBody>({
    mutationFn: (body) => updateProject(id, token, body),
    onSuccess: (data) => {
      queryClient.setQueryData(["project", "edit", id], data);
      queryClient.invalidateQueries({ queryKey: ["project", "slug", data.slug] });
    },
  });
}

function invalidateProjectViews(queryClient: QueryClient, projectId: number) {
  queryClient.invalidateQueries({ queryKey: ["project", "edit", projectId] });
  queryClient.invalidateQueries({
    predicate: (q) => q.queryKey[0] === "project" && q.queryKey[1] === "slug",
  });
  queryClient.invalidateQueries({ queryKey: ["project", "example"] });
}

export function useCreateMilestone(projectId: number, token: string) {
  const queryClient = useQueryClient();
  return useMutation<unknown, ApiError, MilestoneInput>({
    mutationFn: (body) => createMilestone(projectId, token, body),
    onSuccess: () => invalidateProjectViews(queryClient, projectId),
  });
}

export function useUpdateMilestone(projectId: number, token: string) {
  const queryClient = useQueryClient();
  return useMutation<
    unknown,
    ApiError,
    { milestoneId: number; body: Partial<MilestoneInput> }
  >({
    mutationFn: ({ milestoneId, body }) =>
      updateMilestone(projectId, milestoneId, token, body),
    onSuccess: () => invalidateProjectViews(queryClient, projectId),
  });
}

export function useDeleteMilestone(projectId: number, token: string) {
  const queryClient = useQueryClient();
  return useMutation<unknown, ApiError, number>({
    mutationFn: (milestoneId) => deleteMilestone(projectId, milestoneId, token),
    onSuccess: () => invalidateProjectViews(queryClient, projectId),
  });
}

export function useDeleteProject(id: number, token: string) {
  return useMutation<{ ok: true }, ApiError, void>({
    mutationFn: () => deleteProject(id, token),
  });
}

export function useGenerateSummary(projectId: number, token: string) {
  const queryClient = useQueryClient();
  return useMutation<{ generated_summary: string }, ApiError, void>({
    mutationFn: () => generateSummary(projectId, token),
    onSuccess: (data) => {
      queryClient.setQueryData<ProjectWithToken | undefined>(
        ["project", "edit", projectId],
        (old) =>
          old ? { ...old, generated_summary: data.generated_summary } : old,
      );
    },
  });
}

export function useGenerateDemoScript(projectId: number, token: string) {
  const queryClient = useQueryClient();
  return useMutation<{ generated_demo_script: string }, ApiError, void>({
    mutationFn: () => generateDemoScript(projectId, token),
    onSuccess: (data) => {
      queryClient.setQueryData<ProjectWithToken | undefined>(
        ["project", "edit", projectId],
        (old) =>
          old
            ? { ...old, generated_demo_script: data.generated_demo_script }
            : old,
      );
    },
  });
}
