from PIL import Image
import numpy as np

src_path = r"C:\Users\seshu\.gemini\antigravity-ide\brain\c3ea5ef1-2b69-4b78-8974-7a7ca4a3b622\.user_uploaded\media_1788003659747.jpg"
out_jpg_path = r"c:\Users\seshu\desktop-pet\vedika\Vyomanta\frontend\public\glass-chamber.jpg"
out_png_path = r"c:\Users\seshu\desktop-pet\vedika\Vyomanta\frontend\public\glass-chamber.png"

img = Image.open(src_path).convert("RGB")
arr = np.array(img, dtype=np.uint8)

# Check top half (where only the glass pillars exist)
top_half = arr[:450, :, :]
top_lum = np.max(top_half, axis=2)
pillar_cols = np.where(np.any(top_lum > 60, axis=0))[0]
print(f"Pillar column span: {pillar_cols[0]} to {pillar_cols[-1]}")

# Base pedestal width is slightly wider than the pillars:
# Left pillar is around pillar_cols[0] (~409), Right pillar is around pillar_cols[-1] (~616)
# The round base pedestal extends from ~370 to ~655
c_center = (pillar_cols[0] + pillar_cols[-1]) // 2
pillar_width = pillar_cols[-1] - pillar_cols[0]
base_width = int(pillar_width * 1.35) # ~280px wide

cmin = max(0, c_center - base_width // 2 - 15)
cmax = min(arr.shape[1], c_center + base_width // 2 + 15)

# Top of glass pillars
top_rows = np.where(np.any(top_lum > 60, axis=1))[0]
rmin = max(0, top_rows[0] - 10)

# Bottom of base pedestal
bottom_half = arr[400:, cmin:cmax, :]
bottom_lum = np.max(bottom_half, axis=2)
bot_rows = np.where(np.any(bottom_lum > 30, axis=1))[0]
rmax = min(arr.shape[0], 400 + bot_rows[-1] + 15)

print(f"Exact Cylinder Bounding Box: rows ({rmin}, {rmax}), cols ({cmin}, {cmax})")
cropped = arr[rmin:rmax, cmin:cmax].copy()
h, w, _ = cropped.shape
print(f"Final Cylinder Dimensions: width={w}, height={h}, aspect ratio (w/h)={w/h:.3f}")

# Background removal:
# Clean zero out background outside the pedestal ellipse / pillars
clean_jpg_arr = cropped.copy()
# Smooth threshold out dark background
bg_mask = (clean_jpg_arr[:, :, 0] < 16) & (clean_jpg_arr[:, :, 1] < 16) & (clean_jpg_arr[:, :, 2] < 16)
clean_jpg_arr[bg_mask] = 0

clean_jpg = Image.fromarray(clean_jpg_arr)
clean_jpg.save(out_jpg_path, quality=98)
print(f"Saved exact glass-chamber.jpg to {out_jpg_path}")

# Transparent PNG
rgba = np.zeros((h, w, 4), dtype=np.uint8)
rgba[:, :, :3] = clean_jpg_arr
alpha = np.clip(np.max(clean_jpg_arr, axis=2).astype(np.float32) * 2.4, 0, 255).astype(np.uint8)

# Solid base pedestal
base_start = int(h * 0.72)
base_solid_mask = np.max(clean_jpg_arr[base_start:, :, :], axis=2) > 12
alpha[base_start:][base_solid_mask] = np.clip(np.max(clean_jpg_arr[base_start:][base_solid_mask], axis=1).astype(np.float32) * 4.5, 140, 255).astype(np.uint8)

rgba[:, :, 3] = alpha
clean_png = Image.fromarray(rgba)
clean_png.save(out_png_path)
print(f"Saved exact glass-chamber.png to {out_png_path}")
