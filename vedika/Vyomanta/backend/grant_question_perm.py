import frappe

def grant_permissions(doctype, role, perm_dict):
    has_perm = frappe.db.exists("Custom DocPerm", {"parent": doctype, "role": role})
    if has_perm:
        print(f"Custom DocPerm already exists for {role} on {doctype}. Updating...")
        doc = frappe.get_doc("Custom DocPerm", has_perm)
        for key, val in perm_dict.items():
            setattr(doc, key, val)
        doc.save(ignore_permissions=True)
    else:
        print(f"Creating Custom DocPerm for {role} on {doctype}...")
        doc_data = {
            "doctype": "Custom DocPerm",
            "parent": doctype,
            "parenttype": "DocType",
            "parentfield": "permissions",
            "role": role,
            "permlevel": 0
        }
        doc_data.update(perm_dict)
        doc = frappe.get_doc(doc_data)
        doc.insert(ignore_permissions=True)
    
    frappe.db.commit()
    frappe.clear_cache(doctype=doctype)

print("Configuring LMS Student permissions...")
# LMS Student needs to read LMS Quiz and LMS Question, and submit quizzes
grant_permissions("LMS Quiz", "LMS Student", {"read": 1, "write": 0, "create": 0})
grant_permissions("LMS Question", "LMS Student", {"read": 1, "write": 0, "create": 0})
grant_permissions("LMS Quiz Submission", "LMS Student", {"read": 1, "write": 1, "create": 1})
print("LMS Student permissions successfully configured!")
