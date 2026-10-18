import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { isImageRef, readImageBlob } from "../../shared/imageStore";

/** Object URLs avoid expanding stored Blobs to Base64 just to show a preview. */
export function StoredImage({src = "", ...props}: ImgHTMLAttributes<HTMLImageElement>) {
  const [loaded, setLoaded] = useState<{source: string; url: string}>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true, objectUrl: string | undefined;
    setFailed(false);
    if (isImageRef(src)) void readImageBlob(src).then(blob => {
      if (!active) return;
      objectUrl = URL.createObjectURL(blob);
      setLoaded({source: src, url: objectUrl});
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [src]);
  if (failed) return <span role="alert">截图已丢失，请重新选择网页元素</span>;
  const url = isImageRef(src) ? (loaded?.source === src ? loaded.url : undefined) : src;
  return <img {...props} src={url} />;
}
