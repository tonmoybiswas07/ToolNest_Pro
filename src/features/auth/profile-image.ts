export const maxProfileImageLength = 160_000;

const uploadedImage = /^data:image\/(?:webp|jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/;

export function profileImageUrl(image?: string | null) {
  if (!image) return;
  if (image.length <= maxProfileImageLength && uploadedImage.test(image)) return image;

  try {
    const url = new URL(image);
    if (
      url.protocol === "https:" &&
      url.hostname === "lh3.googleusercontent.com" &&
      !url.username &&
      !url.password
    ) {
      return url.href;
    }
  } catch {
    return;
  }
}
