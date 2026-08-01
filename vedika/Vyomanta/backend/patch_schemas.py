import os
import json

app_dirs = [
    "/home/frappe/frappe-bench/apps/frappe",
    "/home/frappe/frappe-bench/apps/lms",
    "/home/frappe/frappe-bench/apps/payments"
]

text_types = {"Text", "Long Text", "Small Text", "Medium Text", "Code", "JSON", "Blob"}

for app_dir in app_dirs:
    if not os.path.exists(app_dir):
        print(f"Directory {app_dir} does not exist, skipping.")
        continue
    print(f"Scanning {app_dir} for schemas...")
    for root, dirs, files in os.walk(app_dir):
        for file in files:
            if file.endswith(".json"):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    
                    modified = False
                    if isinstance(data, dict) and "fields" in data:
                        for field in data["fields"]:
                            if field.get("fieldtype") in text_types and "default" in field:
                                print(f"Removing default for {field.get('fieldname')} ({field.get('fieldtype')}) in {os.path.basename(filepath)}")
                                del field["default"]
                                modified = True
                    
                    if modified:
                        with open(filepath, "w", encoding="utf-8") as f:
                            json.dump(data, f, indent=1, ensure_ascii=False)
                except Exception as e:
                    print(f"Error processing {filepath}: {e}")
