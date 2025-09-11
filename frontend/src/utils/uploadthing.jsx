// frontend/src/utils/uploadthing.jsx
import { generateReactHelpers } from "@uploadthing/react";

// Since we are in a separate frontend project, we can't import the backend
// router type directly. We call the helper function without a generic type.
// This will still work perfectly for JavaScript projects.
export const { useUploadThing, uploadFiles } = generateReactHelpers();
