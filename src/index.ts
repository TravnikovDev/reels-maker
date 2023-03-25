import { prepareImages } from "./prepareImages";
import { createImageSequences } from "./createImageSequences";

// Your project code goes here
const imagePaths = ["image1.jpg", "image2.jpg", "image3.jpg"];
const audioPath = "audio.mp3";
const outputPath = "output.mp4";
const frameDuration = 0.5; // You can adjust this value based on the peak timecodes

prepareImages(imagePaths, 1080, 1920, "output")
  .then((resizedImagePaths) =>
    createImageSequences(
      resizedImagePaths,
      audioPath,
      frameDuration,
      outputPath
    )
  )
  .then(() => console.log("Video created:", outputPath))
  .catch((error) => console.error("Error creating video:", error));
