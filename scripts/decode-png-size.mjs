// @level domain
/**
 * A PNG's width and height, decoded from the bytes it is handed: the IHDR
 * chunk's first two fields, at bytes 16 and 20. It reads no file.
 */

/** The width and height `png` (the file's bytes) says it holds. */
export const decodePngSize = (png) => ({ width: png.readUInt32BE(16), height: png.readUInt32BE(20) });
