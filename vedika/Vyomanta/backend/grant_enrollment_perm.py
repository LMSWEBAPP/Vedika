import frappe

doctype = "LMS Enrollment"

# Ensure Custom DocPerm exists for Guest with Read/Write/Create
has_perm = frappe.db.exists("Custom DocPerm", {"parent": doctype, "role": "Guest"})
if has_perm:
    print("Custom DocPerm already exists for Guest. Updating permissions...")
    doc = frappe.get_doc("Custom DocPerm", has_perm)
    doc.read = 1
    doc.write = 1
    doc.create = 1
    doc.save(ignore_permissions=True)
else:
    print("Creating Custom DocPerm for Guest...")
    doc = frappe.get_doc({
        "doctype": "Custom DocPerm",
        "parent": doctype,
        "parenttype": "DocType",
        "parentfield": "permissions",
        "role": "Guest",
        "permlevel": 0,
        "read": 1,
        "write": 1,
        "create": 1,
        "delete": 0
    })
    doc.insert(ignore_permissions=True)

frappe.db.commit()
frappe.clear_cache(doctype=doctype)
print("Guest permissions for LMS Enrollment successfully configured!")
