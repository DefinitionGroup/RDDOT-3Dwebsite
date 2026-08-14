import type { RevisionDisplaySnapshot } from "@/features/projects/revision-display";

export type EditableProjectRevision = {
  id: string;
  label: string | null;
  trigger: "version-save" | "share" | "photo" | "quote";
  displaySnapshot: RevisionDisplaySnapshot | null;
  createdAt: string;
};

export type EditableProject = {
  id: string;
  name: string;
  updatedAt: string;
  version: number;
  revisions: EditableProjectRevision[];
  revisionTotalCount: number;
  revisionNextCursor: { createdAt: string; id: string } | null;
};
