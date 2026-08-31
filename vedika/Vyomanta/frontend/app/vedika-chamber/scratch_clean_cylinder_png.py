from PIL import Image
import numpy as np

src_path = r"C:\Users\seshu\.gemini\antigravity-ide\brain\c3ea5ef1-2b69-4b78-8974-7a7ca4a3b622\.user_uploaded\media_1788003659747.jpg"
out_png = r"c:\Users\seshu\desktop-pet\vedika\Vyomanta\frontend\public\glass-chamber.png"

img = Image.open(src_path).convert("RGB")
arr = np.array(img, dtype=np.uint8)

# Coordinates in 1024x560:
# Left Pillar: x=408 to 436, y=36 to 440
# Right Pillar: x=588 to 616, y=36 to 440
# Pedestal: x=375 to 649, y=440 to 516
xmin, xmax = 375, 649
ymin, ymax = 36, 516

cropped = arr[ymin:ymax, xmin:xmax].copy()
h, w, _ = cropped.shape
print(f"Cropped dimensions: {w}x{h}")

l_min, l_max = 408 - xmin, 436 - xmin
r_min, r_max = 588 - xmin, 616 - xmin
ped_top = 440 - ymin
ped_bot = 516 - ymin

# 100% clean transparent RGBA
clean_rgba = np.zeros((h, w, 4), dtype=np.uint8)
gray = np.max(cropped, axis=2)

# 1. Left Pillar (only within x: l_min to l_max)
for y in range(0, ped_top):
    for x in range(l_min, l_max + 1):
        val = gray[y, x]
        if val > 15:
            clean_rgba[y, x, :3] = cropped[y, x]
            clean_rgba[y, x, 3] = min(255, int(val * 3.2))

# 2. Right Pillar (only within x: r_min to r_max)
for y in range(0, ped_top):
    for x in range(r_min, r_max + 1):
        val = gray[y, x]
        if val > 15:
            clean_rgba[y, x, :3] = cropped[y, x]
            clean_rgba[y, x, 3] = min(255, int(val * 3.2))

# 3. Top curved glass rim (only top 45px between pillars)
for y in range(0, 45):
    for x in range(l_max + 1, r_min):
        val = gray[y, x]
        if val > 40:
            clean_rgba[y, x, :3] = cropped[y, x]
            clean_rgba[y, x, 3] = min(160, int((val - 30) * 2.2))

# 4. Base Metallic Pedestal (y >= ped_top and y < ped_bot)
for y in range(ped_top, ped_bot):
    for x in range(w):
        val = gray[y, x]
        edge_x = min(x, w - 1 - x)
        edge_y = ped_bot - 1 - y
        corner_dist = min(edge_x, edge_y * 1.6)
        corner_factor = min(1.0, max(0.0, corner_dist / 5.0))

        if val > 8:
            clean_rgba[y, x, :3] = cropped[y, x]
            clean_rgba[y, x, 3] = min(255, int(max(val * 4.0, 220.0 * corner_factor)))

# Check center region to ensure 100% 0 alpha
center_crop = clean_rgba[50:ped_top, l_max+1:r_min]
print(f"Center crop max alpha: {np.max(center_crop[:, :, 3])}")
print(f"Center crop sum alpha: {np.sum(center_crop[:, :, 3])}")

Image.fromarray(clean_rgba).save(out_png)
print(f"Saved verified 100% clean glass-chamber.png to {out_png}")
