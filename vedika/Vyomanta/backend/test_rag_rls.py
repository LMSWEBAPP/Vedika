import frappe
import json
import uuid
from lms.lms.api import retrieve_secure_chunks_internal

def create_test_entities():
    print("Setting up test entities...")
    
    # 0. Ensure Role "Instructor" exists
    if not frappe.db.exists("Role", "Instructor"):
        role_doc = frappe.get_doc({
            "doctype": "Role",
            "role_name": "Instructor"
        })
        role_doc.insert(ignore_permissions=True)
        
    # 1. Ensure Test Users first (so they exist for course link validation)
    users = [
        {"email": "student_a@test.com", "name": "Student A", "role": "LMS Student"},
        {"email": "student_b@test.com", "name": "Student B", "role": "LMS Student"},
        {"email": "instructor_x@test.com", "name": "Instructor X", "role": "Instructor"}
    ]
    
    for u in users:
        if not frappe.db.exists("User", u["email"]):
            user = frappe.get_doc({
                "doctype": "User",
                "email": u["email"],
                "first_name": u["name"],
                "enabled": 1
            })
            user.insert(ignore_permissions=True)
            user.add_roles(u["role"])

    # 2. Ensure Test Course with mandatory fields and instructors
    course_id = "test-rag-course"
    if not frappe.db.exists("LMS Course", course_id):
        course = frappe.get_doc({
            "doctype": "LMS Course",
            "name": course_id,
            "title": "Test RAG Course",
            "published": 1,
            "short_introduction": "Test short introduction",
            "description": "Test description",
            "instructors": [
                {
                    "parentfield": "instructors",
                    "parenttype": "LMS Course",
                    "instructor": "instructor_x@test.com"
                }
            ]
        })
        course.insert(ignore_permissions=True)
    
    # 3. Enroll Student A and B in Course
    for student_email in ["student_a@test.com", "student_b@test.com"]:
        if not frappe.db.exists("LMS Enrollment", {"member": student_email, "course": course_id}):
            enrollment = frappe.get_doc({
                "doctype": "LMS Enrollment",
                "member": student_email,
                "course": course_id
            })
            enrollment.insert(ignore_permissions=True)
            
    # 4. Assign Instructor X to Course (double check mapping in child table)
    if not frappe.db.exists("Course Instructor", {"parent": course_id, "instructor": "instructor_x@test.com"}):
        instructor = frappe.get_doc({
            "doctype": "Course Instructor",
            "parent": course_id,
            "parenttype": "LMS Course",
            "parentfield": "instructors",
            "instructor": "instructor_x@test.com"
        })
        instructor.insert(ignore_permissions=True)
        
    frappe.db.commit()
    print("Test entities created successfully.")

def cleanup_test_entities():
    print("Cleaning up test entities...")
    course_id = "test-rag-course"
    
    # Delete test document metadata and chunks
    frappe.db.sql("DELETE FROM `tabLMS Session Document` WHERE course_id = %s", (course_id,))
    frappe.db.sql("DELETE FROM `LMS Document Chunk` WHERE course_id = %s", (course_id,))
    
    # Delete enrollments
    frappe.db.sql("DELETE FROM `tabLMS Enrollment` WHERE course = %s", (course_id,))
    
    # Delete course instructors
    frappe.db.sql("DELETE FROM `tabCourse Instructor` WHERE parent = %s", (course_id,))
    
    # Delete course
    frappe.db.sql("DELETE FROM `tabLMS Course` WHERE name = %s", (course_id,))
    
    # Delete users
    for email in ["student_a@test.com", "student_b@test.com", "instructor_x@test.com"]:
        frappe.db.sql("DELETE FROM `tabUser` WHERE name = %s", (email,))
        frappe.db.sql("DELETE FROM `tabHas Role` WHERE parent = %s", (email,))
        
    frappe.db.commit()
    print("Cleanup completed.")

def run_tests():
    course_id = "test-rag-course"
    session_a = "session-uuid-student-a"
    session_b = "session-uuid-student-b"
    file_key_a = "tenant-1/student_a/test-file.pdf"
    doc_uuid_a = "doc-uuid-student-a"
    
    print("\n--- Running RLS Test Suite ---")
    
    # 1. Insert mock session document for Student A
    frappe.db.sql(
        """
        INSERT INTO `tabLMS Session Document` 
        (name, file_name, file_key, session_id, course_id, tenant_id, owner, status, docstatus, idx)
        VALUES (%s, %s, %s, %s, %s, %s, %s, 'completed', 0, 0)
        """,
        (doc_uuid_a, "StudentA_File.pdf", file_key_a, session_a, course_id, "test-tenant", "student_a@test.com")
    )
    
    # Insert mock vector chunk for Student A's document
    # Using a 768-dim mock vector representation
    mock_vector = [0.1] * 768
    chunk_id = str(uuid.uuid4())
    frappe.db.sql(
        """
        INSERT INTO `LMS Document Chunk` 
        (id, document_id, session_id, user_id, course_id, tenant_id, chunk_index, page_number, content, embedding, embedding_model, embedding_version)
        VALUES (%s, %s, %s, %s, %s, %s, 0, 1, 'Mock content for Student A document', %s, 'mock-model', 'v1')
        """,
        (chunk_id, doc_uuid_a, session_a, "student_a@test.com", course_id, "test-tenant", str(mock_vector))
    )
    frappe.db.commit()
    
    # Set request headers for internal service whitelist validation using Werkzeug Request Mock
    from werkzeug.test import EnvironBuilder
    from werkzeug.wrappers import Request
    environ = EnvironBuilder(headers={"X-Internal-Token": "internal_key_123"}).get_environ()
    frappe.local.request = Request(environ)
    
    # Mock search parameters
    query_vector_str = json.dumps(mock_vector)
    
    # Test Case 1: Student A fetches their own document chunks
    print("\nTest Case 1: Student A fetches their own chunks...")
    ctx_a = json.dumps({
        "tenantId": "test-tenant",
        "userId": "student_a@test.com",
        "sessionId": session_a,
        "courseId": course_id
    })
    res_a = retrieve_secure_chunks_internal(ctx_a, query_vector_str)
    chunks_a = res_a.get("chunks", [])
    assert len(chunks_a) == 1, f"Expected 1 chunk, got {len(chunks_a)}"
    assert chunks_a[0]["content"] == "Mock content for Student A document"
    print("PASSED: Student A successfully retrieved their own document chunk.")
    
    # Test Case 2: Student B attempts to hijack Student A's session documents
    print("\nTest Case 2: Student B attempts cross-session hijack...")
    ctx_b_hijack = json.dumps({
        "tenantId": "test-tenant",
        "userId": "student_b@test.com",
        "sessionId": session_a, # Target Student A's session
        "courseId": course_id
    })
    res_b = retrieve_secure_chunks_internal(ctx_b_hijack, query_vector_str)
    chunks_b = res_b.get("chunks", [])
    assert len(chunks_b) == 0, f"Security Breach! Student B retrieved Student A's session chunks: {chunks_b}"
    print("PASSED: Student B was blocked from accessing Student A's session data.")
    
    # Test Case 3: Student B queries their own empty session
    print("\nTest Case 3: Student B queries their own empty session...")
    ctx_b_empty = json.dumps({
        "tenantId": "test-tenant",
        "userId": "student_b@test.com",
        "sessionId": session_b,
        "courseId": course_id
    })
    res_b_empty = retrieve_secure_chunks_internal(ctx_b_empty, query_vector_str)
    chunks_b_empty = res_b_empty.get("chunks", [])
    assert len(chunks_b_empty) == 0
    print("PASSED: Student B correctly returned 0 chunks from their empty session.")
    
    # Test Case 4: Instructor X queries Student A's session documents
    print("\nTest Case 4: Instructor X queries Student A's session documents...")
    ctx_inst = json.dumps({
        "tenantId": "test-tenant",
        "userId": "instructor_x@test.com",
        "sessionId": session_a,
        "courseId": course_id
    })
    res_inst = retrieve_secure_chunks_internal(ctx_inst, query_vector_str)
    chunks_inst = res_inst.get("chunks", [])
    assert len(chunks_inst) == 1, f"Expected Instructor X to read course files, got {len(chunks_inst)}"
    print("PASSED: Instructor X successfully retrieved the course session chunks.")
    
    # Test Case 5: Non-enrolled Student attempts access
    print("\nTest Case 5: Non-enrolled Student accesses Course...")
    ctx_unenrolled = json.dumps({
        "tenantId": "test-tenant",
        "userId": "student_b@test.com",
        "sessionId": session_a,
        "courseId": "another-random-course-999" # Not enrolled in this course
    })
    res_unenrolled = retrieve_secure_chunks_internal(ctx_unenrolled, query_vector_str)
    assert "error" in res_unenrolled, "Expected enrollment validation failure response."
    print("PASSED: Unenrolled student was denied access.")
    
    # Test Case 6: Enrolled student retrieves chunks from instructor-uploaded shared document attached to their session
    print("\nTest Case 6: Enrolled student retrieves chunks from instructor-uploaded shared document...")
    doc_uuid_inst = "doc-uuid-instructor-shared"
    file_key_inst = "tenant-1/instructor_x/shared-file.pdf"
    
    # Insert Instructor's original upload document
    frappe.db.sql(
        """
        INSERT INTO `tabLMS Session Document` 
        (name, file_name, file_key, session_id, course_id, tenant_id, owner, status, docstatus, idx)
        VALUES (%s, %s, %s, %s, %s, %s, %s, 'completed', 0, 0)
        """,
        (doc_uuid_inst, "Instructor_Shared.pdf", file_key_inst, "instructor-session", course_id, "test-tenant", "instructor_x@test.com")
    )
    
    # Insert chunk for Instructor's document
    chunk_id_inst = str(uuid.uuid4())
    frappe.db.sql(
        """
        INSERT INTO `LMS Document Chunk` 
        (id, document_id, session_id, user_id, course_id, tenant_id, chunk_index, page_number, content, embedding, embedding_model, embedding_version)
        VALUES (%s, %s, %s, %s, %s, %s, 0, 1, 'Mock content for Instructor shared document', %s, 'mock-model', 'v1')
        """,
        (chunk_id_inst, doc_uuid_inst, "instructor-session", "instructor_x@test.com", course_id, "test-tenant", str(mock_vector))
    )
    
    # Student A attaches Instructor's document to their session (owner = student_a@test.com)
    doc_uuid_inst_attached = "doc-uuid-instructor-shared-attached"
    frappe.db.sql(
        """
        INSERT INTO `tabLMS Session Document` 
        (name, file_name, file_key, session_id, course_id, tenant_id, owner, status, docstatus, idx)
        VALUES (%s, %s, %s, %s, %s, %s, %s, 'completed', 0, 0)
        """,
        (doc_uuid_inst_attached, "Instructor_Shared.pdf", file_key_inst, session_a, course_id, "test-tenant", "student_a@test.com")
    )
    frappe.db.commit()
    
    # Query Instructor shared document from Student A session
    res_shared = retrieve_secure_chunks_internal(ctx_a, query_vector_str)
    chunks_shared = res_shared.get("chunks", [])
    
    # Filter to find the instructor's chunk
    inst_chunks = [c for c in chunks_shared if c["document_id"] == doc_uuid_inst]
    assert len(inst_chunks) == 1, f"Expected Student A to retrieve instructor's shared chunk, got: {chunks_shared}"
    assert inst_chunks[0]["content"] == "Mock content for Instructor shared document"
    print("PASSED: Student A successfully retrieved chunks from instructor-uploaded shared document.")
    
    # Test Case 7: TOCTOU check — Student A is unenrolled mid-session
    print("\nTest Case 7: TOCTOU check (Student A unenrolled mid-session)...")
    # Delete student A's enrollment
    frappe.db.sql("DELETE FROM `tabLMS Enrollment` WHERE member = %s AND course = %s", ("student_a@test.com", course_id))
    frappe.db.commit()
    
    # Student A attempts to query the instructor's shared document now
    res_revoked = retrieve_secure_chunks_internal(ctx_a, query_vector_str)
    chunks_revoked = res_revoked.get("chunks", [])
    
    # Assert that the instructor's shared chunk is NOT returned after unenrollment
    inst_chunks_revoked = [c for c in chunks_revoked if c["document_id"] == doc_uuid_inst]
    assert len(inst_chunks_revoked) == 0, f"Security Breach! Student retrieved instructor shared document chunks after unenrollment: {inst_chunks_revoked}"
    print("PASSED: Access to instructor shared document was immediately revoked for unenrolled student (TOCTOU check passed).")

def main():
    try:
        create_test_entities()
        run_tests()
        print("\n🎉 ALL RAG RLS SECURITY & CONCURRENCY TESTS PASSED!")
    finally:
        cleanup_test_entities()

main()
