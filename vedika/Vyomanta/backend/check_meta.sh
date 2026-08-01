#!/bin/bash
cd /home/frappe/frappe-bench
bench --site lms.localhost execute "
meta = frappe.get_meta('Course Instructor')
link_doctype = meta.get_field('instructor').options
print('Links to:', link_doctype)
print('Valid instructors:', frappe.get_all(link_doctype, pluck='name'))
"
