const {
  createUploadthing,
  createRouteHandler,
} = require("uploadthing/express");
const express = require("express");

const f = createUploadthing();

const ourFileRouter = {
  imageUploader: f({ image: { maxFileSize: "4MB" } }).onUploadComplete(
    async ({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId);
      console.log("file url", file.url);
    }
  ),
};

const uploadthingRoute = express.Router();
uploadthingRoute.use(
  "/",
  createRouteHandler({
    router: ourFileRouter,
  })
);

module.exports = { uploadthingRoute, ourFileRouter };
