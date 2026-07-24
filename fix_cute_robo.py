import os
import json
from PIL import Image

pet_json_path = r"assets/Cute-Robo/pet.json"
spritesheet_path = r"assets/Cute-Robo/spritesheet.webp"

if os.path.exists(spritesheet_path):
    img = Image.open(spritesheet_path)
    img_w, img_h = img.size
    
    # Cute-Robo spritesheet is a 5 columns x 5 rows grid
    cols = 5
    rows = 5
    
    frame_w = img_w // cols
    frame_h = img_h // rows
    
    print(f"Image Size: {img_w}x{img_h} px")
    print(f"Grid: {cols} columns x {rows} rows")
    print(f"Frame Size: width={frame_w}, height={frame_h}")
    
    # Load existing pet.json if available
    config = {
        "id": "cute_robo",
        "displayName": "Cute Robo",
        "description": "A cute astronaut robot pet companion.",
        "spritesheetPath": "spritesheet.webp",
        "sprite": {
            "width": frame_w,
            "height": frame_h,
            "columns": cols,
            "rows": rows
        },
        "defaultAnimation": "idle",
        "scale": 1.0,
        "behavior": {
            "idle": 0.45,
            "walk": 0.25,
            "wave": 0.1,
            "jump": 0.05,
            "review": 0.1,
            "failed": 0.05
        },
        "animations": {
            "idle": {
                "fps": 6,
                "loop": True,
                "frames": [[0, c] for c in range(5)]
            },
            "run_right": {
                "fps": 8,
                "loop": True,
                "frames": [[0, c] for c in range(5)]
            },
            "run_left": {
                "fps": 8,
                "loop": True,
                "frames": [[0, c] for c in range(5)]
            },
            "review": {
                "fps": 6,
                "loop": False,
                "frames": [[1, c] for c in range(5)]
            },
            "waiting": {
                "fps": 6,
                "loop": True,
                "frames": [[2, c] for c in range(5)]
            },
            "wave": {
                "fps": 6,
                "loop": False,
                "frames": [[3, c] for c in range(5)]
            },
            "jump": {
                "fps": 8,
                "loop": False,
                "frames": [[4, 0], [4, 1], [4, 2]]
            },
            "failed": {
                "fps": 6,
                "loop": False,
                "frames": [[4, 3], [4, 4]]
            }
        }
    }
    
    with open(pet_json_path, "w") as f:
        json.dump(config, f, indent=2)
    print(f"Successfully updated {pet_json_path}")
else:
    print(f"Error: {spritesheet_path} not found")
