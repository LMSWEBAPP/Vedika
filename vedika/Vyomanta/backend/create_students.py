import frappe
from frappe.utils.password import update_password

# Print existing courses to debug what is in the database
try:
    courses = frappe.get_all("LMS Course", fields=["name", "title", "published"])
    print("DEBUG: EXISTING COURSES IN DB:", courses)
except Exception as e:
    print("DEBUG: Failed to fetch courses:", e)


def grant_permission(doctype, role, read=1, write=0, create=0, delete=0):
    try:
        if not frappe.db.exists("DocType", doctype) or not frappe.db.exists("Role", role):
            print(f"Skipping permission grant for {doctype} -> {role} (DocType or Role missing)")
            return
        has_perm = frappe.db.exists("Custom DocPerm", {"parent": doctype, "role": role})
        if has_perm:
            doc = frappe.get_doc("Custom DocPerm", has_perm)
            doc.read = read
            doc.write = write
            doc.create = create
            doc.delete = delete
            doc.save(ignore_permissions=True)
            print(f"Updated permissions for {doctype} -> {role}")
        else:
            doc = frappe.get_doc({
                "doctype": "Custom DocPerm",
                "parent": doctype,
                "parenttype": "DocType",
                "parentfield": "permissions",
                "role": role,
                "permlevel": 0,
                "read": read,
                "write": write,
                "create": create,
                "delete": delete
            })
            doc.insert(ignore_permissions=True)
            print(f"Created permissions for {doctype} -> {role}")
        frappe.clear_cache(doctype=doctype)
    except Exception as e:
        print(f"Failed to grant permissions for {doctype} to {role}: {e}")

# Grant permissions for LMS DocTypes
permissions_to_grant = [
    # LMS Course
    ("LMS Course", "LMS Student", 1, 0, 0, 0),
    ("LMS Course", "Guest", 1, 0, 0, 0),
    
    # Course Chapter
    ("Course Chapter", "LMS Student", 1, 0, 0, 0),
    ("Course Chapter", "Guest", 1, 0, 0, 0),
    
    # Course Lesson
    ("Course Lesson", "LMS Student", 1, 0, 0, 0),
    ("Course Lesson", "Guest", 1, 0, 0, 0),
    
    # LMS Course Category
    ("LMS Course Category", "LMS Student", 1, 0, 0, 0),
    ("LMS Course Category", "Guest", 1, 0, 0, 0),
    
    # LMS Enrollment
    ("LMS Enrollment", "LMS Student", 1, 1, 1, 0),
    ("LMS Enrollment", "Guest", 1, 1, 1, 0),
    
    # LMS Batch
    ("LMS Batch", "LMS Student", 1, 0, 0, 0),
    ("LMS Batch", "Guest", 1, 0, 0, 0),
    
    # LMS Certificate
    ("LMS Certificate", "LMS Student", 1, 0, 0, 0),
    
    # Job Opportunity
    ("Job Opportunity", "LMS Student", 1, 0, 0, 0),
    ("Job Opportunity", "Guest", 1, 0, 0, 0),
    
    # LMS Job Application
    ("LMS Job Application", "LMS Student", 1, 1, 1, 0),
    
    # LMS Quiz
    ("LMS Quiz", "LMS Student", 1, 0, 0, 0),
    ("LMS Quiz", "Guest", 1, 0, 0, 0),
    
    # LMS Quiz Question
    ("LMS Quiz Question", "LMS Student", 1, 0, 0, 0),
    ("LMS Quiz Question", "Guest", 1, 0, 0, 0),
    
    # LMS Quiz Submission
    ("LMS Quiz Submission", "LMS Student", 1, 1, 1, 0),
    
    # LMS Assignment
    ("LMS Assignment", "LMS Student", 1, 0, 0, 0),
    ("LMS Assignment", "Guest", 1, 0, 0, 0),
    
    # LMS Assignment Submission
    ("LMS Assignment Submission", "LMS Student", 1, 1, 1, 0),
]

for dt, role, r, w, c, d in permissions_to_grant:
    grant_permission(dt, role, r, w, c, d)



students = [
    {"email": "student@lms.com", "name": "Student"},
    {"email": "student1@lms.com", "name": "Aarav Mehta"},
    {"email": "student2@lms.com", "name": "Sneha Patel"},
    {"email": "student3@lms.com", "name": "Rohan Sharma"},
    {"email": "student4@lms.com", "name": "Priya Nair"},
    {"email": "student5@lms.com", "name": "Aditya Rao"}
]

for s in students:
    email = s["email"]
    name = s["name"]
    
    if not frappe.db.exists("User", email):
        print(f"Creating user {email} ({name})...")
        first_name = name.split(" ")[0]
        last_name = name.split(" ")[1] if len(name.split(" ")) > 1 else ""
        user = frappe.get_doc({
            "doctype": "User",
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
            "enabled": 1,
            "send_welcome_email": 0
        })
        try:
            user.insert(ignore_permissions=True)
        except Exception as u_err:
            print(f"Warning inserting user {email}: {u_err}")
        
        # Add LMS student role if it exists
        if frappe.db.exists("Role", "LMS Student"):
            try:
                user.add_roles("LMS Student")
            except Exception:
                pass
    else:
        print(f"User {email} already exists.")

    # Always set/update the password to ensure it matches 'student123'
    print(f"Setting password for {email} to 'student123'...")
    update_password(user=email, pwd="student123", logout_all_sessions=False)

# Bootstrap administrator user 'admin@lms.com'
admin_email = "admin@lms.com"
if not frappe.db.exists("User", admin_email):
    print(f"Creating administrator user {admin_email}...")
    user = frappe.get_doc({
        "doctype": "User",
        "email": admin_email,
        "first_name": "Admin",
        "enabled": 1,
        "send_welcome_email": 0
    })
    user.insert(ignore_permissions=True)
    
    for r in ["System Manager", "Instructor", "LMS Student"]:
        if frappe.db.exists("Role", r):
            user.add_roles(r)
else:
    # Ensure role permissions are updated even if the user exists
    user = frappe.get_doc("User", admin_email)
    for r in ["System Manager", "Instructor", "LMS Student"]:
        if frappe.db.exists("Role", r) and r not in [ur.role for ur in user.roles]:
            user.add_roles(r)
    print(f"Administrator {admin_email} already exists, roles verified.")

# Always set/update the admin password to ensure it matches 'admin123'
print(f"Setting password for {admin_email} to 'admin123'...")
update_password(user=admin_email, pwd="admin123", logout_all_sessions=False)

# Seed Google Social Login Key
try:
    import os
    google_client_id = os.environ.get("GOOGLE_CLIENT_ID")
    google_client_secret = os.environ.get("GOOGLE_CLIENT_SECRET")
    
    if google_client_id and google_client_secret:
        print("Seeding Google Social Login Key...")
        
        # Dynamically determine the backend's external URL to support different servers
        backend_url = (
            os.environ.get("RENDER_EXTERNAL_URL") 
            or os.environ.get("BACKEND_URL") 
            or os.environ.get("FRAPPE_URL") 
            or os.environ.get("NEXT_PUBLIC_FRAPPE_URL") 
            or "https://vyomantha-testing.onrender.com"
        )
        backend_url = backend_url.rstrip("/")
        redirect_url = f"{backend_url}/api/method/frappe.integrations.oauth2_logins.login_via_google"
        print(f"Using dynamic Google OAuth Redirect URL: {redirect_url}")
        
        if not frappe.db.exists("Social Login Key", "google"):
            doc = frappe.get_doc({
                "doctype": "Social Login Key",
                "name": "google",
                "enable_social_login": 1,
                "social_login_provider": "Google",
                "client_id": google_client_id,
                "client_secret": google_client_secret,
                "provider_name": "Google",
                "base_url": "https://accounts.google.com",
                "authorize_url": "https://accounts.google.com/o/oauth2/v2/auth",
                "access_token_url": "https://oauth2.googleapis.com/token",
                "redirect_url": redirect_url,
                "api_endpoint": "https://www.googleapis.com/oauth2/v2/userinfo",
                "user_id_property": "email",
                "custom_base_url": 1,
                "sign_ups": "Allow",
                "auth_url_data": '{"scope": "openid https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email", "response_type": "code"}'
            })
            doc.insert(ignore_permissions=True)
            print("Google Social Login Key inserted successfully via Frappe API.")
        else:
            doc = frappe.get_doc("Social Login Key", "google")
            doc.client_id = google_client_id
            doc.client_secret = google_client_secret
            doc.custom_base_url = 1
            doc.base_url = "https://accounts.google.com"
            doc.authorize_url = "https://accounts.google.com/o/oauth2/v2/auth"
            doc.access_token_url = "https://oauth2.googleapis.com/token"
            doc.redirect_url = redirect_url
            doc.api_endpoint = "https://www.googleapis.com/oauth2/v2/userinfo"
            doc.sign_ups = "Allow"
            doc.save(ignore_permissions=True)
            print("Google Social Login Key updated successfully via Frappe API.")
            
        # Ensure default portal role is LMS Student so new registrants get it automatically
        try:
            portal_settings = frappe.get_single("Portal Settings")
            portal_settings.default_role = "LMS Student"
            portal_settings.save(ignore_permissions=True)
            print("Set default_role to 'LMS Student' in Portal Settings.")
        except Exception as portal_err:
            print(f"Failed to set default portal role: {portal_err}")
            
    else:
        print("Skipping Google Social Login Key seeding: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables not set.")
except Exception as e:
    print(f"Failed to seed Google Social Login Key: {e}")

# Diagnostics check at startup
try:
    print("DIAGNOSTICS: Calling get_google_auth_url...")
    import lms.lms.api
    print("DIAGNOSTICS api.__file__:", lms.lms.api.__file__)
    print("DIAGNOSTICS api attributes:", [attr for attr in dir(lms.lms.api) if 'google' in attr or 'traceback' in attr])
    
    try:
        with open(lms.lms.api.__file__, 'r') as f:
            lines = f.readlines()
        print("DIAGNOSTICS api.py last 30 lines:")
        for line in lines[-30:]:
            print(line.rstrip())
    except Exception as file_err:
        print("Failed to read api.py:", file_err)

    from lms.lms.api import get_google_auth_url
    res = get_google_auth_url("http://localhost:3000/auth/callback")
    print("DIAGNOSTICS SUCCESS:", res)
except Exception as e:
    import traceback
    tb_str = traceback.format_exc()
    print("DIAGNOSTICS FAILED:", e)
    print(tb_str)
    try:
        frappe.log_error(title="Google Auth Diagnostics", message=tb_str)
        frappe.db.commit()
        print("Logged diagnostic failure to database successfully.")
    except Exception as log_err:
        print("Failed to log diagnostic failure:", log_err)
# Create Custom DocType 'LMS Session Document' programmatically so Frappe ORM registers it
try:
    if not frappe.db.exists("DocType", "LMS Session Document"):
        print("Creating custom DocType 'LMS Session Document'...")
        doc = frappe.get_doc({
            "doctype": "DocType",
            "name": "LMS Session Document",
            "module": "LMS",
            "custom": 1,
            "autoname": "hash",
            "fields": [
                {"fieldname": "file_name", "label": "File Name", "fieldtype": "Data", "reqd": 1, "in_list_view": 1},
                {"fieldname": "file_key", "label": "File Key", "fieldtype": "Data", "reqd": 1},
                {"fieldname": "session_id", "label": "Session ID", "fieldtype": "Data", "reqd": 1, "in_list_view": 1},
                {"fieldname": "course_id", "label": "Course ID", "fieldtype": "Data", "reqd": 1, "in_list_view": 1},
                {"fieldname": "tenant_id", "label": "Tenant ID", "fieldtype": "Data", "reqd": 1, "in_list_view": 1},
                {"fieldname": "status", "label": "Status", "fieldtype": "Select", "options": "pending_ingestion\nprocessing\ncompleted\nfailed", "default": "pending_ingestion", "reqd": 1, "in_list_view": 1}
            ],
            "permissions": [
                {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1},
                {"role": "LMS Student", "read": 1, "write": 1, "create": 1},
                {"role": "Instructor", "read": 1, "write": 1, "create": 1, "delete": 1}
            ]
        })
        doc.insert(ignore_permissions=True)
        print("DocType 'LMS Session Document' created successfully.")
    else:
        print("DocType 'LMS Session Document' already exists.")
except Exception as doctype_err:
    print(f"Failed to create 'LMS Session Document' DocType: {doctype_err}")

frappe.db.commit()
print("Students bootstrap completed successfully!")

