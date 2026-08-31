from PIL import Image
import numpy as np

img = Image.open(r"c:\Users\seshu\desktop-pet\vedika\Vyomanta\frontend\public\glass-chamber.png")
arr = np.array(img)
h, w, c = arr.shape
print(f"PNG dimensions: {w}x{h}, channels: {c}")

# Check center region (inside glass, y: 100 to 350, x: 50 to 220)
center_crop = arr[100:350, 50:220]
print(f"Center crop max alpha: {np.max(center_crop[:, :, 3])}")
print(f"Center crop mean alpha: {np.mean(center_crop[:, :, 3])}")
print(f"Center crop max RGB: {np.max(center_crop[:, :, :3])}")

# Let's inspect unique non-zero alpha coordinates
non_zero_y, non_zero_x = np.where(arr[:, :, 3] > 0)
print(f"Non-zero Alpha Y bounds: {np.min(non_zero_y)} to {np.max(non_zero_y)}")
print(f"Non-zero Alpha X bounds: {np.min(non_zero_x)} to {np.max(non_zero_x)}")
