import os

def patch_files():
    search_dirs = [
        "/home/frappe/frappe-bench/apps",
        "/home/frappe/frappe-bench/env/lib"
    ]
    
    target_str = "max_statement_time"
    patched_count = 0
    
    print("Starting search for 'max_statement_time' in python files...")
    
    for search_dir in search_dirs:
        if not os.path.exists(search_dir):
            print(f"Directory {search_dir} does not exist, skipping.")
            continue
            
        for root, dirs, files in os.walk(search_dir):
            for file in files:
                if file.endswith(".py"):
                    filepath = os.path.join(root, file)
                    try:
                        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                            content = f.read()
                            
                        if target_str in content:
                            print(f"\nFOUND '{target_str}' in: {filepath}")
                            
                            # Print the lines containing target_str
                            lines = content.splitlines()
                            for idx, line in enumerate(lines):
                                if target_str in line:
                                    print(f"  Line {idx+1}: {line}")
                            
                            # Perform safe replacement of the SET STATEMENT prefix construction
                            new_content = content
                            
                            # Replace occurrences where SET STATEMENT is prepended
                            replacements = [
                                ('"SET STATEMENT max_statement_time=1 FOR "', '""'),
                                ("'SET STATEMENT max_statement_time=1 FOR '", '""'),
                                ('"SET STATEMENT max_statement_time=1 FOR {query}"', 'f"{query}"'),
                                ("'SET STATEMENT max_statement_time=1 FOR {query}'", 'f"{query}"'),
                                ('"SET STATEMENT max_statement_time=1 FOR %s"', '"%s"'),
                                ("'SET STATEMENT max_statement_time=1 FOR %s'", "'%s'"),
                                ('"SET STATEMENT max_statement_time="', '""'),
                                ("'SET STATEMENT max_statement_time='", "''"),
                            ]
                            
                            for old, new in replacements:
                                if old in new_content:
                                    print(f"  -> Replacing: {old}  with  {new}")
                                    new_content = new_content.replace(old, new)
                                    
                            # Let's write the modified content back
                            if new_content != content:
                                with open(filepath, "w", encoding="utf-8") as f:
                                    f.write(new_content)
                                print(f"  Successfully patched {filepath}")
                                patched_count += 1
                                
                    except Exception as e:
                        print(f"Error processing {filepath}: {e}")
                        
    print(f"\nPatching complete. Patched {patched_count} files.")

if __name__ == "__main__":
    patch_files()
