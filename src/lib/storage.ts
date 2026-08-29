import { supabase } from "./supabase";

/**
 * Uploads a local file (from file input / drag & drop) to Supabase Storage bucket 'roster-images'.
 * Falls back to compressed base64 data URL if storage bucket network upload fails.
 */
export async function uploadRosterImage(file: File): Promise<string> {
  const fileExt = file.name.split(".").pop() || "png";
  const fileName = `operator-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
  const filePath = `avatars/${fileName}`;

  try {
    const { error } = await supabase.storage
      .from("roster-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (!error) {
      const { data: publicData } = supabase.storage
        .from("roster-images")
        .getPublicUrl(filePath);

      if (publicData?.publicUrl) {
        return publicData.publicUrl;
      }
    }
  } catch (err) {
    console.warn("Supabase storage upload failed, converting to local data URI fallback:", err);
  }

  // Fallback: Read as base64 Data URL so local image is guaranteed to persist and display
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}
