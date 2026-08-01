try:
    import frappe  # type: ignore
except ImportError:
    import sys
    print("WARNING: 'frappe' module not found. This script must be executed inside the Frappe bench Docker container.")
    sys.exit(0)

frappe.init(site="lms.localhost")
frappe.connect()

def grant_guest_read(doctype):
    has_perm = frappe.db.exists("Custom DocPerm", {"parent": doctype, "role": "Guest", "read": 1})
    if not has_perm:
        try:
            doc = frappe.get_doc({
                "doctype": "Custom DocPerm",
                "parent": doctype,
                "parenttype": "DocType",
                "parentfield": "permissions",
                "role": "Guest",
                "permlevel": 0,
                "read": 1,
                "write": 0,
                "create": 0,
                "delete": 0
            })
            doc.insert(ignore_permissions=True)
            frappe.db.commit()
            frappe.clear_cache(doctype=doctype)
            print(f"Guest READ permission added successfully for {doctype}!")
        except Exception as e:
            print(f"Failed to grant permissions for {doctype}: {e}")
    else:
        print(f"Guest already has permission for {doctype}.")

# Grant guest read permissions
doctypes = [
    "LMS Course", "LMS Batch", "LMS Quiz", "LMS Quiz Submission", 
    "LMS Assignment", "LMS Assignment Submission", "Job Opportunity",
    "LMS Question", "LMS Quiz Question", "Course Chapter", "Course Lesson",
    "Chapter Reference", "Lesson Reference", "Course Instructor"
]
for dt in doctypes:
    if frappe.db.exists("DocType", dt):
        grant_guest_read(dt)

def print_doctype_fields(doctype_name):
    if not frappe.db.exists("DocType", doctype_name):
        print(f"DocType {doctype_name} does not exist.")
        return
    meta = frappe.get_meta(doctype_name)
    print(f"\n--- {doctype_name} Fields ---")
    print([(f.fieldname, f.fieldtype, f.options) for f in meta.fields if not f.fieldname.startswith("column_break") and not f.fieldname.startswith("section_break")])

for dt in doctypes:
    print_doctype_fields(dt)






