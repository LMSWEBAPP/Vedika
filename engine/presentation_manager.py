import os
import glob
import base64
import mimetypes
from pathlib import Path

def get_default_presentations_dir():
    """Gets the standard system Documents directory for Vedika Presentations."""
    try:
        user_docs = os.path.join(os.path.expanduser("~"), "Documents", "VedikaPresentations")
        os.makedirs(user_docs, exist_ok=True)
        return user_docs
    except Exception:
        fallback = os.path.join(os.getcwd(), "VedikaPresentations")
        os.makedirs(fallback, exist_ok=True)
        return fallback

class LocalPresentationManager:
    def __init__(self, root_dir=None):
        self.root_dir = root_dir or get_default_presentations_dir()
        self.ensure_default_folders()

    def ensure_default_folders(self):
        """Creates initial demo presentation folders on user system on first launch."""
        demo_folders = ["Product_Launch_2026", "Physics_Viva_Demo", "AI_Project_Presentation"]
        for folder in demo_folders:
            folder_path = os.path.join(self.root_dir, folder)
            os.makedirs(folder_path, exist_ok=True)
            
            # Create a README note inside each demo folder
            readme_path = os.path.join(folder_path, "README.txt")
            if not os.path.exists(readme_path):
                try:
                    with open(readme_path, "w", encoding="utf-8") as f:
                        f.write(
                            f"=== Vedika Presentation Folder: {folder} ===\n"
                            "Drop your presentation images (.png, .jpg, .webp, .svg), PDFs, and document notes into this folder.\n"
                            "Vedika's Desktop Mascot will read these files directly from your computer during live speech presentations!\n"
                        )
                except Exception:
                    pass

    def list_presentation_folders(self):
        """Lists all presentation folders created in the system VedikaPresentations directory."""
        if not os.path.exists(self.root_dir):
            self.ensure_default_folders()

        folders = []
        try:
            for entry in os.listdir(self.root_dir):
                full_path = os.path.join(self.root_dir, entry)
                if os.path.isdir(full_path):
                    files = [f for f in os.listdir(full_path) if os.path.isfile(os.path.join(full_path, f))]
                    folders.append({
                        "name": entry,
                        "path": full_path,
                        "fileCount": len(files)
                    })
        except Exception as e:
            print(f"[LocalPresentationManager] Error listing folders: {e}")
        return folders

    def get_folder_assets(self, folder_name):
        """Reads all assets from a specific local system presentation folder."""
        folder_path = os.path.join(self.root_dir, folder_name)
        if not os.path.exists(folder_path):
            return []

        assets = []
        try:
            for filename in os.listdir(folder_path):
                file_path = os.path.join(folder_path, filename)
                if os.path.isfile(file_path):
                    ext = os.path.splitext(filename)[1].lower()
                    is_image = ext in [".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif"]
                    is_doc = ext in [".pdf", ".txt", ".md", ".doc", ".docx"]

                    asset_info = {
                        "name": filename,
                        "path": file_path,
                        "ext": ext,
                        "type": "image" if is_image else "document" if is_doc else "file",
                        "sizeBytes": os.path.getsize(file_path)
                    }

                    # Attach Data URI for images so WebApp can render them directly over WebSocket
                    if is_image:
                        try:
                            mime_type, _ = mimetypes.guess_type(file_path)
                            mime_type = mime_type or "image/png"
                            with open(file_path, "rb") as img_f:
                                encoded = base64.b64encode(img_f.read()).decode("utf-8")
                                asset_info["dataUrl"] = f"data:{mime_type};base64,{encoded}"
                        except Exception as img_err:
                            print(f"Could not encode image {filename}: {img_err}")

                    assets.append(asset_info)
        except Exception as e:
            print(f"[LocalPresentationManager] Error reading folder assets: {e}")
        return assets

    def find_matching_asset(self, folder_name, query_keyword):
        """Finds a matching image/document in the local folder based on presenter speech topic."""
        assets = self.get_folder_assets(folder_name)
        if not assets:
            return None

        query_lower = query_keyword.lower()
        for asset in assets:
            asset_name_lower = asset["name"].lower()
            if query_lower in asset_name_lower or any(word in asset_name_lower for word in query_lower.split()):
                return asset

        # Return first image asset if no keyword match is found
        images = [a for a in assets if a["type"] == "image"]
        return images[0] if images else None
