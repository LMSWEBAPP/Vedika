import cv2
import numpy as np
from PIL import Image

src_path = r"C:\Users\seshu\.gemini\antigravity-ide\brain\c3ea5ef1-2b69-4b78-8974-7a7ca4a3b622\.user_uploaded\media_1788003659747.jpg"
out_png = r"c:\Users\seshu\desktop-pet\vedika\Vyomanta\frontend\public\glass-chamber.png"
out_jpg = r"c:\Users\seshu\desktop-pet\vedika\Vyomanta\frontend\public\glass-chamber.jpg"

img_bgr = cv2.imread(src_path)
h_orig, w_orig, _ = img_bgr.shape
gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

# Key coordinates in source 1024x560:
# Left Pillar: x=408 to x=436, y=36 to y=440
# Right Pillar: x=588 to x=616, y=36 to y=440
# Pedestal: Left x=375, Right x=649, Top y=440, Bottom y=516

xmin, xmax = 375, 649
ymin, ymax = 36, 516

cropped_rgb = rgb[ymin:ymax, xmin:xmax].copy()
cropped_gray = gray[ymin:ymax, xmin:xmax].copy()
h, w, _ = cropped_rgb.shape

l_min, l_max = 408 - xmin, 436 - xmin
r_min, r_max = 588 - xmin, 616 - xmin
ped_top = 440 - ymin
ped_bot = 516 - ymin

# 100% clean mask initialized to absolute 0
mask = np.zeros((h, w), dtype=np.float32)

# 1. Above pedestal (y < ped_top):
for y in range(0, ped_top):
    for x in range(w):
        val = cropped_gray[y, x]
        # Left Pillar
        if x >= l_min and x <= l_max:
            if val > 15:
                mask[y, x] = min(255.0, val * 3.2)
        # Right Pillar
        elif x >= r_min and x <= r_max:
            if val > 15:
                mask[y, x] = min(255.0, val * 3.2)
        # Top curved glass rim (only top 12% of height between pillars)
        elif x > l_max and x < r_min and y < int(ped_top * 0.16):
            if val > 35:
                mask[y, x] = min(190.0, (val - 25) * 2.8)
        # Everywhere else above pedestal is STRICTLY 0!

# 2. Base Pedestal (y >= ped_top and y < ped_bot):
for y in range(ped_top, ped_bot):
    for x in range(w):
        val = cropped_gray[y, x]
        # Round the bottom corners slightly
        edge_x = min(x, w - 1 - x)
        edge_y = ped_bot - 1 - y
        corner_dist = min(edge_x, edge_y * 1.6)
        corner_factor = min(1.0, max(0.0, corner_dist / 5.0))

        if val > 8:
            mask[y, x] = min(255.0, max(val * 4.2, 220.0 * corner_factor))

# Soft 3x3 gaussian blur for smooth anti-aliased edge
mask = cv2.GaussianBlur(mask, (3, 3), 0)
mask_u8 = np.clip(mask, 0, 255).astype(np.uint8)

# Construct Clean RGBA
rgba = np.zeros((h, w, 4), dtype=np.uint8)
clean_rgb = cropped_rgb.copy()
# Absolute zero outside mask
clean_rgb[mask_u8 == 0] = 0
rgba[:, :, :3] = clean_rgb
rgba[:, :, 3] = mask_u8

Image.fromarray(rgba).save(out_png)
print(f"Saved 100% clean PNG to {out_png}")

# Construct Clean JPG
alpha_norm = (mask_u8.astype(np.float32) / 255.0)[:, :, np.newaxis]
clean_jpg = (clean_rgb.astype(np.float32) * np.clip(alpha_norm * 1.15, 0.0, 1.0)).astype(np.uint8)
clean_jpg[mask_u8 == 0] = 0

Image.fromarray(clean_jpg).save(out_jpg, quality=98)
print(f"Saved 100% clean JPG to {out_jpg}")
print(f"Final billboard dimensions: {w}x{h}, aspect ratio={w/h:.3f}")
