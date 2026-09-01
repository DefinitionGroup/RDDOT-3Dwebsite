import type { PhotoJob } from "@/features/photo-jobs/photo-job-module";

export type SerializedPhotoJob = Omit<PhotoJob, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

export function serializeJob(job: PhotoJob): SerializedPhotoJob {
  return {
    ...job,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString()
  };
}
