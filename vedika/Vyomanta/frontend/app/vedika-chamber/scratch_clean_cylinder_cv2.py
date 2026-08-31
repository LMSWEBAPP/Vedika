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

# Detect exact pillar centers
# Upper 70% of image contains the vertical pillars
upper = gray[:int(h_orig * 0.70), :]
col_max = np.max(upper, axis=0)

# Left pillar peak is around col 410-435
left_peak = 400 + np.argmax(col_max[400:460])
# Right pillar peak is around col 585-620
right_peak = 580 + np.argmax(col_max[580:640])
center_x = (left_peak + right_peak) // 2

print(f"Pillars detected: Left Peak={left_peak}, Right Peak={right_peak}, Center={center_x}")

# Top row of pillars
top_row = np.where(np.max(gray[:, left_peak-10:right_peak+10], axis=1) > 80)[0][0]

# Pedestal width
ped_half_w = int((right_peak - left_peak) * 0.65) # ~135px half width
xmin = center_x - ped_half_w - 8
xmax = center_x + ped_half_w + 8

# Pedestal bottom in source image is around y=515
bot_row = 525

ymin = max(0, top_row - 6)
ymax = min(h_orig, bot_row + 4)

cropped_rgb = rgb[ymin:ymax, xmin:xmax].copy()
cropped_gray = gray[ymin:ymax, xmin:xmax].copy()
h, w, _ = cropped_rgb.shape

local_left = left_peak - xmin
local_right = right_peak - xmin
local_center = center_x - xmin
base_y = int(h * 0.73)

print(f"Cropped size: {w}x{h}, aspect ratio={w/h:.3f}")

# Clean Mask:
alpha = np.zeros((h, w), dtype=np.float32)

# 1. Base Pedestal (Ellipse mask from base_y to h)
ped_rx = (local_right - local_left) * 0.64
ped_ry = (h - base_y) * 0.96

for y in range(base_y - 12, h):
    # Ellipse center is (local_center, base_y + (h - base_y)*0.45)
    cy = base_y + (h - base_y) * 0.35
    for x in range(w):
        dx = (x - local_center) / ped_rx
        # Top of pedestal extends up to base_y - 12
        if y < base_y:
            in_ped = abs(dx) <= 0.95
        else:
            dy = (y - cy) / (ped_ry * 0.75)
            in_ped = (dx**2 + dy**2) <= 1.05

        if in_ped:
            val = cropped_gray[y, x]
            if val > 6:
                edge_dist = 1.0 - min(1.0, abs(dx))
                alpha[y, x] = min(255.0, max(val * 4.5, 200.0 * (edge_dist**0.5)))

# 2. Vertical Glass Pillars (Left & Right)
pillar_half_thickness = 18
for y in range(0, base_y):
    for x in range(w):
        val = cropped_gray[y, x]
        # Left pillar
        if abs(x - local_left) <= pillar_half_thickness:
            if val > 12:
                alpha[y, x] = min(255.0, val * 3.0)
        # Right pillar
        elif abs(x - local_right) <= pillar_half_thickness:
            if val > 12:
                alpha[y, x] = min(255.0, val * 3.0)
        # Top curved glass lip
        elif x > local_left and x < local_right:
            if y < int(h * 0.16) and val > 35:
                alpha[y, x] = min(180.0, val * 2.0)
            elif val > 45:
                # Very subtle glass sheen
                alpha[y, x] = min(50.0, (val - 35) * 1.5)

# Smooth edges
alpha = cv2.GaussianBlur(alpha, (3, 3), 0)
alpha_uint8 = np.clip(alpha, 0, 255).astype(np.uint8)

# Construct Clean RGBA
rgba = np.zeros((h, w, 4), dtype=np.uint8)
rgba[:, :, :3] = cropped_rgb
rgba[:, :, 3] = alpha_uint8

Image.fromarray(rgba).save(out_png)
print(f"Saved clean PNG to {out_png}")

# Construct Clean JPG (pure #000000 black background)
clean_jpg = cropped_rgb.copy()
clean_jpg[alpha_uint8 == 0] = 0
# Multiply RGB by normalized alpha to eliminate any dark grey fringe
alpha_norm = (alpha_uint8.astype(np.float32) / 255.0)[:, :, np.newaxis]
clean_jpg = (clean_jpg.astype(np.float32) * np.clip(alpha_norm * 1.2, 0.0, 1.0)).astype(np.uint8)

Image.fromarray(clean_jpg).save(out_jpg, quality=98)
print(f"Saved pure black background JPG to {out_jpg}")
