import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api-client';
import { Project, ProjectAsset } from '@gamescribe/shared-types';

export interface ProjectWithAssets extends Project {
  assets: ProjectAsset[];
}

export function useProject(projectId?: string) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<ProjectWithAssets | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = async () => {
    setLoading(true);
    const res = await apiFetch<Project[]>('/projects');
    if (res.success && res.data) {
      setProjects(res.data);
    } else {
      setError(res.error?.message || 'Failed to fetch projects');
    }
    setLoading(false);
  };

  const fetchProjectDetails = async (id: string) => {
    setLoading(true);
    const res = await apiFetch<ProjectWithAssets>(`/projects/${id}`);
    if (res.success && res.data) {
      setCurrentProject(res.data);
    } else {
      setError(res.error?.message || 'Failed to load project');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (projectId) {
      fetchProjectDetails(projectId);
    } else {
      fetchProjects();
    }
  }, [projectId]);

  return { projects, currentProject, loading, error, refetch: fetchProjects, refetchDetails: fetchProjectDetails };
}
