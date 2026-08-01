import frappe

doctypes = [
    "LMS Enrollment",
    "LMS Quiz Submission",
    "LMS Quiz",
    "LMS Assignment Submission",
    "LMS Assignment",
    "Course Lesson",
    "Course Chapter",
    "LMS Course",
    "LMS Batch"
]

for dt in doctypes:
    if frappe.db.exists("DocType", dt):
        docs = frappe.get_all(dt, pluck="name")
        print(f"Deleting {len(docs)} records from {dt}...")
        for doc in docs:
            try:
                frappe.delete_doc(dt, doc, ignore_permissions=True, force=True)
            except Exception as e:
                print(f"Failed to delete {doc} from {dt}: {e}")

frappe.db.commit()
print("Data clear completed successfully!")
