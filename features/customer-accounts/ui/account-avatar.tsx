"use client";

import { useRef, useState } from "react";
import { Pill } from "@/components/design-system/pill";
import { AVATAR_INPUT_TYPES, AVATAR_LIMITS } from "@/features/customer-accounts/customer-avatar";
import { apiErrorMessage } from "@/lib/messages";
import { useMessages } from "@/lib/messages/locale-context";

/**
 * The account's circle: the photo when there is one, the initials beneath it
 * while it loads or when it cannot. The image is a private redirect, so it is
 * a plain `<img>`, not an optimised asset.
 */
export function AccountAvatar({
  avatarId,
  className = "",
  initials
}: {
  avatarId: string | null;
  className?: string;
  initials: string;
}) {
  const [failedId, setFailedId] = useState<string | null>(null);
  return (
    <span
      aria-hidden="true"
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-pill border border-hairline bg-charcoal font-display tracking-[-0.02em] text-ink ${className}`}
    >
      {initials}
      {avatarId && failedId !== avatarId && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          className="absolute inset-0 size-full object-cover"
          onError={() => setFailedId(avatarId)}
          src={`/api/account/avatar?v=${avatarId}`}
        />
      )}
    </span>
  );
}

/**
 * Scales a picture to at most 1600 px on its longest edge, upright, as a JPEG
 * on charcoal (for transparent PNGs). Drawing it anew also leaves its EXIF
 * behind before anything is sent. Null when the browser cannot read it.
 */
async function scaleForUpload(file: File): Promise<Blob | null> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return null;
  }
  const scale = Math.min(1, AVATAR_LIMITS.uploadEdgeMax / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.fillStyle = "#202020";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
}

type EditorState = { kind: "idle" } | { kind: "uploading" } | { kind: "removing" } | { kind: "error"; message: string };

/** "Foto": upload, change or remove the photo. Only its owner sees it. */
export function AvatarEditor({
  avatarId,
  initials,
  onChange
}: {
  avatarId: string | null;
  initials: string;
  onChange: (avatarId: string | null) => void;
}) {
  const messages = useMessages();
  const t = messages.account;
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<EditorState>({ kind: "idle" });
  const busy = state.kind === "uploading" || state.kind === "removing";

  async function upload(file: File) {
    setState({ kind: "uploading" });
    try {
      const picture = await scaleForUpload(file);
      if (!picture) {
        setState({ kind: "error", message: apiErrorMessage(messages, { code: "avatar-not-an-image" }, t.photoFailed) });
        return;
      }
      const response = await fetch("/api/account/avatar", {
        method: "POST",
        headers: { "Content-Type": picture.type },
        body: picture
      });
      const payload = (await response.json().catch(() => null)) as { avatar?: { id: string } } | null;
      if (!response.ok || !payload?.avatar) {
        setState({ kind: "error", message: apiErrorMessage(messages, payload, t.photoFailed) });
        return;
      }
      onChange(payload.avatar.id);
      setState({ kind: "idle" });
    } catch {
      setState({ kind: "error", message: messages.common.connectionLostRetry });
    }
  }

  async function remove() {
    setState({ kind: "removing" });
    try {
      const response = await fetch("/api/account/avatar", { method: "DELETE" });
      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null);
        setState({ kind: "error", message: apiErrorMessage(messages, payload, t.photoFailed) });
        return;
      }
      onChange(null);
      setState({ kind: "idle" });
    } catch {
      setState({ kind: "error", message: messages.common.connectionLostRetry });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
      <AccountAvatar avatarId={avatarId} className="size-20 text-[1.75rem]" initials={initials} />
      <div className="min-w-0">
        <p className="m-0 text-nav">{t.photo}</p>
        <p className="m-0 mt-1 max-w-[46ch] text-caption text-graphite">{t.photoHint}</p>
        <div className="-ml-5 mt-3 flex flex-wrap items-center gap-1">
          <Pill disabled={busy} onClick={() => inputRef.current?.click()} variant="ghost">
            {state.kind === "uploading" ? t.photoUploading : avatarId ? t.photoChange : t.photoUpload}
          </Pill>
          {avatarId && (
            <Pill disabled={busy} onClick={() => void remove()} variant="ghost">
              {state.kind === "removing" ? t.photoRemoving : t.photoRemove}
            </Pill>
          )}
        </div>
        <input
          accept={AVATAR_INPUT_TYPES.join(",")}
          aria-hidden="true"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void upload(file);
          }}
          ref={inputRef}
          tabIndex={-1}
          type="file"
        />
        <p aria-live="polite" className="m-0 mt-2 min-h-5 text-caption text-ink">
          {state.kind === "error" && state.message}
        </p>
      </div>
    </div>
  );
}
