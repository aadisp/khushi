const CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

const UPLOAD_PRESET =
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export async function uploadToCloudinary(
  file: File
) {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      "Cloudinary configuration is missing."
    );
  }

  const formData = new FormData();

  formData.append("file", file);
  formData.append(
    "upload_preset",
    UPLOAD_PRESET
  );

  const resourceType =
    file.type.startsWith("video/")
      ? "video"
      : "image";

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    const errorText =
      await response.text();

    console.error(
      "Cloudinary upload error:",
      errorText
    );

    throw new Error(
      "Cloudinary upload failed."
    );
  }

  const data = await response.json();

  return {
    url: data.secure_url as string,
    publicId: data.public_id as string,
    resourceType:
      data.resource_type as
        | "image"
        | "video",
    format: data.format as string,
    bytes: data.bytes as number,
  };
}