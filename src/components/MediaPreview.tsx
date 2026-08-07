/**
 * Renders the voice note or photo a customer submitted. Blob URLs are not
 * public, so both variants go through /api/admin/media, which streams the
 * object behind the admin session.
 */
export default function MediaPreview({
  sourceType,
  mediaUrl,
}: {
  sourceType: string;
  mediaUrl: string;
}) {
  const proxyUrl = `/api/admin/media?url=${encodeURIComponent(mediaUrl)}`;

  if (sourceType === "photo") {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={proxyUrl}
        alt="Submitted note"
        className="max-h-64 rounded-lg border border-brand-border"
      />
    );
  }

  return (
    <audio controls className="w-full">
      <source src={proxyUrl} />
    </audio>
  );
}
