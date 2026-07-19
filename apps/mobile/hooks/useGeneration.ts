import { useState, useRef, useEffect } from 'react';
import { apiFetch } from '../lib/api-client';
import { GenerateScriptRequest, GenerationJobStatus } from '@gamescribe/shared-types';

export function useGeneration(projectId: string) {
  const [jobStatus, setJobStatus] = useState<GenerationJobStatus | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const startGeneration = async (params: GenerateScriptRequest) => {
    setIsGenerating(true);
    setError(null);

    const res = await apiFetch<{ jobId: string }>(`/projects/${projectId}/generate`, {
      method: 'POST',
      body: JSON.stringify(params),
    });

    if (!res.success || !res.data) {
      setError(res.error?.message || 'Failed to start generation job');
      setIsGenerating(false);
      return;
    }

    const jobId = res.data.jobId;

    // Start polling job status every 1.5 seconds
    pollIntervalRef.current = setInterval(async () => {
      const statusRes = await apiFetch<GenerationJobStatus>(`/projects/${projectId}/status?jobId=${jobId}`);
      if (statusRes.success && statusRes.data) {
        setJobStatus(statusRes.data);

        if (statusRes.data.status === 'completed') {
          setIsGenerating(false);
          stopPolling();
        } else if (statusRes.data.status === 'failed') {
          setError(statusRes.data.error || 'Generation failed');
          setIsGenerating(false);
          stopPolling();
        }
      }
    }, 1500);
  };

  useEffect(() => {
    return () => stopPolling();
  }, []);

  return { startGeneration, jobStatus, isGenerating, error };
}
