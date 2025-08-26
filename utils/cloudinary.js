import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = async (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error("File does not exist: " + filePath);  
    }

    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: "auto" // ✅ Correct JS syntax
    });

    // Optionally delete the local file after upload
    fs.unlinkSync(filePath);
    console.log("Cloudinary upload result:", result);
    return result.secure_url; // return the URL of the uploaded image
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath); // delete local file on error
    throw error;
  }
};

export { uploadToCloudinary };
