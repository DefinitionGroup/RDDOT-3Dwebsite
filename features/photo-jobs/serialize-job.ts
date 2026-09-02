import type { PhotoJob } from "@/features/photo-jobs/photo-job-module";

export type SerializedPhotoJob = Omit<
  PhotoJob,
  "createdAt" | "updatedAt" | "submittedAt" | "completedAt"
> & {
  submittedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function serializeJob(job: PhotoJob): SerializedPhotoJob {
  return {
    ...job,
    submittedAt: job.submittedAt ? job.submittedAt.toISOString() : null,
    completedAt: job.completedAt ? job.completedAt.toISOString() : null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString()
  };
}
