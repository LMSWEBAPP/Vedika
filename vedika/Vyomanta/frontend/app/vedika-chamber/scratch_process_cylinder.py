import sys
from PIL import Image
import numpy as np

src_path = r"C:\Users\seshu\.gemini\antigravity-ide\brain\c3ea5ef1-2b69-4b78-8974-7a7ca4a3b622\.user_uploaded\media_1788003659747.jpg"
out_path = r"c:\Users\seshu\desktop-pet\vedika\Vyomanta\frontend\public\glass-chamber.png"
out_jpg_path = r"c:\Users\seshu\desktop-pet\vedika\Vyomanta\frontend\public\glass-chamber.jpg"

img = Image.open(src_path).convert("RGBA")
arr = np.array(img, dtype=np.float32)

# Dimensions
h, w, _ = arr.shape
print(f"Original image shape: {arr.shape}")

# Find bounding box of the cylinder
# The background is dark (< 25 max channel)
rgb_max = np.max(arr[:, :, :3], axis=2)
mask = rgb_max > 18

rows = np.any(mask, axis=1)
cols = np.any(mask, axis=0)
rmin, rmax = np.where(rows)[0][[0, -1]]
cmin, cmax = np.where(cols)[0][[0, -1]]

# Add small padding
padding = 10
rmin = max(0, rmin - padding)
rmax = min(h, rmax + padding)
cmin = max(0, cmin - padding)
cmax = min(w, cmax + padding)

cropped_arr = arr[rmin:rmax, cmin:cmax].copy()
cropped_h, cropped_w, _ = cropped_arr.shape
print(f"Cropped shape: {cropped_arr.shape}")

# Create transparency / pure black for clean rendering:
# Method 1: Transparent PNG where black background is transparent
# For additive blending and standard alpha blending:
# In the glass area and glowing pillars:
# The glass pillar has high brightness, the base has dark grey/metallic highlights with blue LED ring.
# We calculate alpha based on luminance and foreground mask:
# Background is dark around the edges.

# Let's save both clean pure black cropped JPG (for additive blending) and transparent PNG (for alpha blending):
# For pure black JPG:
# Zero out background pixels that are outside the cylinder bounding box or below threshold
clean_jpg_arr = cropped_arr[:, :, :3].copy()
# Smooth threshold out the outer background
bg_dist_x = np.minimum(np.arange(cropped_w), cropped_w - 1 - np.arange(cropped_w))
bg_dist_y = np.arange(cropped_h) # from top

# Threshold floor background
floor_bg_mask = (cropped_arr[:, :, 0] < 16) & (cropped_arr[:, :, 1] < 16) & (cropped_arr[:, :, 2] < 16)
clean_jpg_arr[floor_bg_mask] = 0

clean_jpg = Image.fromarray(np.clip(clean_jpg_arr, 0, 255).astype(np.uint8))
clean_jpg.save(out_jpg_path, quality=98)
print(f"Saved clean JPG to {out_jpg_path}")

# For Transparent PNG:
# Calculate alpha from max RGB channel with smooth curve for dark base pedestal
alpha = np.zeros((cropped_h, cropped_w), dtype=np.float32)
# Inside the cylinder region
# For bright highlights: alpha = 1.0
# For base pedestal: ensure base opacity is preserved
base_y_start = int(cropped_h * 0.72)
alpha[:base_y_start] = np.clip(np.max(cropped_arr[:base_y_start, :, :3], axis=2) / 120.0 * 255.0, 0, 255)
# In base area:
base_rgb_max = np.max(cropped_arr[base_y_start:, :, :3], axis=2)
alpha[base_y_start:] = np.clip(np.where(base_rgb_max > 12, np.clip(base_rgb_max * 4.5, 40, 255), 0), 0, 255)

cropped_arr[:, :, 3] = alpha
clean_png = Image.fromarray(np.clip(cropped_arr, 0, 255).astype(np.uint8))
clean_png.save(out_path)
print(f"Saved clean PNG to {out_path}")
