const sharp = require("sharp");

/**
 * Extracts a specific icon from a grid-like image based on the icon index
 * @param {string} imagePath - Path to the source image
 * @param {Object} padding - Padding information
 * @param {number} padding.top - Top padding in pixels
 * @param {number} padding.left - Left padding in pixels
 * @param {number} padding.spacing - Spacing between icons in pixels
 * @param {number} iconSize - Size of each icon (width and height) in pixels
 * @param {number} iconIndex - Index of the icon to extract (0-based)
 * @param {number} iconsPerRow - Number of icons per row in the grid
 * @returns {Promise<Buffer>} - Returns a promise that resolves to the extracted icon as a buffer
 */
async function extractIconFromGrid(
  imagePath,
  padding,
  iconSize,
  iconIndex,
  iconsPerRow,
) {
  // Calculate the row and column based on the icon index
  const row = Math.floor(iconIndex / iconsPerRow);
  const col = iconIndex % iconsPerRow;

  // Calculate the exact position where to extract the icon
  const left = padding.left + col * (iconSize + padding.spacing);
  const top = padding.top + row * (iconSize + padding.spacing);

  try {
    // Extract the region using Sharp
    const extractedIcon = await sharp(imagePath)
      .extract({
        left: left,
        top: top,
        width: iconSize,
        height: iconSize,
      })
      .toBuffer();

    return extractedIcon;
  } catch (error) {
    throw new Error(`Failed to extract icon: ${error.message}`);
  }
}

/**
 * Sends an image buffer as a response through Express
 * @param {Buffer} imageBuffer - The image buffer to send
 * @param {Object} res - Express response object
 * @param {string} [filename] - Optional filename for the download
 * @param {boolean} [download=false] - Whether to force download or display inline
 */
function sendImageBuffer(
  imageBuffer,
  res,
  filename = "image.png",
  download = false,
) {
  res.set("Content-Type", "image/png");

  if (download) {
    res.set("Content-Disposition", `attachment; filename="${filename}"`);
  } else {
    res.set("Content-Disposition", "inline");
  }

  res.send(imageBuffer);
}

module.exports = {
  extractIconFromGrid,
  sendImageBuffer,
};
