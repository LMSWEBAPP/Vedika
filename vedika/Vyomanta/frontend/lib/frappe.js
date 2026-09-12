// lib/frappe.js

const FRAPPE_URL = typeof window !== 'undefined'
  ? window.location.origin
  : (process.env.FRAPPE_URL || process.env.NEXT_PUBLIC_FRAPPE_URL || 'http://localhost:8080');

export function sanitizeTitle(title) {
  if (!title) return title;
  return title.replace(/#/g, 'No.');
}

// Default demo courses fallback
const DEFAULT_COURSES = [
  { id: '1', title: 'Python Fundamentals', instructor: 'Administrator', category: 'Professionals', enrolled: 37, status: 'Published', date: 'Jan 11, 2023' },
  { id: '2', title: 'Data Structures & Algorithms', instructor: 'John Samoh', category: 'Collaborate', enrolled: 25, status: 'Published', date: 'Jan 11, 2023' },
  { id: '3', title: 'Advanced Machine Learning', instructor: 'John Smiths', category: 'Collaborate', enrolled: 12, status: 'Published', date: 'Jan 11, 2023' },
  { id: '4', title: 'Web Development with Next.js', instructor: 'John Sarith', category: 'Collaborate', enrolled: 18, status: 'Draft', date: 'Jan 11, 2023' },
];

// Client-side cache for optimized loading
const clientCache = {
  courses: {},          // Map of userId -> list
  coursesTimestamp: {}, // Map of userId -> timestamp
  syllabus: {},         // Map of courseId -> { data, timestamp }
};

// Helper to get active user ID to scope cache keys
function getActiveUserId() {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('frappe_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.email || parsed.name || 'anonymous';
      }
    } catch (e) {}
  }
  return 'anonymous';
}

// Helper to invalidate cache across all user sessions
export function invalidateCoursesCache() {
  clientCache.courses = {};
  clientCache.coursesTimestamp = {};
  if (typeof window !== 'undefined') {
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('cached_courses_list_') || key.startsWith('cached_courses_timestamp_')) {
          localStorage.removeItem(key);
        }
      });
      localStorage.setItem('courses_updated_ts', Date.now().toString());
      window.dispatchEvent(new Event('courses_updated'));
    } catch (e) {}
  }
}

export function invalidateSyllabusCache(courseId) {
  if (courseId) {
    delete clientCache.syllabus[courseId];
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`cached_syllabus_${courseId}`);
      localStorage.removeItem(`cached_syllabus_timestamp_${courseId}`);
    }
  } else {
    clientCache.syllabus = {};
    if (typeof window !== 'undefined') {
      // Clear all cached read syllabuses from localStorage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('cached_syllabus_')) {
          localStorage.removeItem(key);
        }
      });
    }
  }
}

async function handleResponse(res, isRest = true) {
  if (!res.ok) {
    let errMsg = `HTTP Error ${res.status}`;
    try {
      const data = await res.json();
      if (data._server_messages) {
        try {
          const msgs = JSON.parse(data._server_messages);
          const parsed = msgs.map(m => {
            try {
              return JSON.parse(m).message;
            } catch (e) {
              return m;
            }
          }).join('\n');
          if (parsed) errMsg = parsed;
        } catch (e) {}
      } else if (data.exception) {
        errMsg = data.exception.split('\n').filter(Boolean).pop() || data.exception;
      } else if (data.exc) {
        try {
          const excList = JSON.parse(data.exc);
          if (excList.length > 0) errMsg = excList[0].split('\n').filter(Boolean).pop() || excList[0];
        } catch (e) {}
      }
    } catch (e) {}
    throw new Error(errMsg);
  }
  const data = await res.json();
  return isRest ? data.data : data.message;
}
const promiseCache = new Map();

function getCachedPromise(key, fetchFn) {
  if (promiseCache.has(key)) {
    return promiseCache.get(key);
  }
  const promise = fetchFn().catch(err => {
    promiseCache.delete(key);
    throw err;
  });
  promiseCache.set(key, promise);
  return promise;
}

export function clearApiCache() {
  promiseCache.clear();
}

export async function frappeGet(method, params = {}) {
  if (!FRAPPE_URL) throw new Error("Frappe URL not configured");
  
  let sid = null;
  if (typeof window !== 'undefined') {
    sid = localStorage.getItem('frappe_sid');
  }
  
  const mergedParams = { ...params };
  if (sid && !mergedParams.sid) {
    mergedParams.sid = sid;
  }
  
  const cacheKey = `GET_METHOD:${method}:${JSON.stringify(mergedParams)}`;
  
  return getCachedPromise(cacheKey, async () => {
    const url = new URL(`${FRAPPE_URL}/api/method/${method}`);
    Object.entries(mergedParams).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-User-Email": getActiveUserId()
      },
    });
    return handleResponse(res, false);
  });
}

export async function frappePost(method, body = {}) {
  if (!FRAPPE_URL) throw new Error("Frappe URL not configured");
  
  promiseCache.clear();
  
  let sid = null;
  if (typeof window !== 'undefined') {
    sid = localStorage.getItem('frappe_sid');
  }
  
  const url = new URL(`${FRAPPE_URL}/api/method/${method}`);
  if (sid) {
    url.searchParams.set('sid', sid);
  }
  
  const res = await fetch(url.toString(), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-User-Email": getActiveUserId()
    },
    body: JSON.stringify(body),
  });
  return handleResponse(res, false);
}

export async function frappeRestGet(resource, params = {}) {
  if (!FRAPPE_URL) throw new Error("Frappe URL not configured");
  
  let sid = null;
  if (typeof window !== 'undefined') {
    sid = localStorage.getItem('frappe_sid');
  }
  
  const mergedParams = { ...params };
  if (sid && !mergedParams.sid) {
    mergedParams.sid = sid;
  }
  
  const cacheKey = `GET_REST:${resource}:${JSON.stringify(mergedParams)}`;
  
  return getCachedPromise(cacheKey, async () => {
    const encodedSegments = resource.split('/').map(segment => encodeURIComponent(segment)).join('/');
    const url = new URL(`${FRAPPE_URL}/api/resource/${encodedSegments}`);
    Object.entries(mergedParams).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-User-Email": getActiveUserId()
      },
    });
    return handleResponse(res, true);
  });
}

export async function frappeRestPost(resource, body = {}) {
  if (!FRAPPE_URL) throw new Error("Frappe URL not configured");
  
  promiseCache.clear();
  
  const encodedSegments = resource.split('/').map(segment => encodeURIComponent(segment)).join('/');
  
  let sid = null;
  if (typeof window !== 'undefined') {
    sid = localStorage.getItem('frappe_sid');
  }
  
  const url = new URL(`${FRAPPE_URL}/api/resource/${encodedSegments}`);
  if (sid) {
    url.searchParams.set('sid', sid);
  }
  
  const res = await fetch(url.toString(), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-User-Email": getActiveUserId()
    },
    body: JSON.stringify(body),
  });
  return handleResponse(res, true);
}

export async function frappeRestPut(resource, name, body = {}) {
  if (!FRAPPE_URL) throw new Error("Frappe URL not configured");
  
  promiseCache.clear();
  
  const encodedResource = resource.split('/').map(segment => encodeURIComponent(segment)).join('/');
  const encodedName = encodeURIComponent(name);
  
  let sid = null;
  if (typeof window !== 'undefined') {
    sid = localStorage.getItem('frappe_sid');
  }
  
  const url = new URL(`${FRAPPE_URL}/api/resource/${encodedResource}/${encodedName}`);
  if (sid) {
    url.searchParams.set('sid', sid);
  }
  
  const res = await fetch(url.toString(), {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-User-Email": getActiveUserId()
    },
    body: JSON.stringify(body),
  });
  return handleResponse(res, true);
}

export async function frappeRestDelete(resource, name) {
  if (!FRAPPE_URL) throw new Error("Frappe URL not configured");
  
  promiseCache.clear();
  
  const encodedResource = resource.split('/').map(segment => encodeURIComponent(segment)).join('/');
  const encodedName = encodeURIComponent(name);
  
  let sid = null;
  if (typeof window !== 'undefined') {
    sid = localStorage.getItem('frappe_sid');
  }
  
  const url = new URL(`${FRAPPE_URL}/api/resource/${encodedResource}/${encodedName}`);
  if (sid) {
    url.searchParams.set('sid', sid);
  }
  
  const res = await fetch(url.toString(), {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  return handleResponse(res, true);
}

// Fetch enrolled courses from Frappe LMS
export async function getEnrolledCourses() {
  if (FRAPPE_URL) {
    return frappeGet("academy_portal.api.get_enrolled_courses");
  }
  // Simulated Fallback
  return DEFAULT_COURSES.filter(c => c.status === 'Published');
}

// --- Course Categories API ---

export async function getCourseCategories() {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/categories', { cache: 'no-store' });
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) {
          localStorage.setItem('admin_course_categories', JSON.stringify(list));
          return list;
        }
      }
    } catch (_) {}

    const saved = localStorage.getItem('admin_course_categories');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (_) {}
    }
  }

  return [
    "Web Development",
    "Frontend",
    "Framework",
    "Data Structures & Algorithms",
    "Python Programming",
    "Finance",
    "Business",
    "Design",
    "Personal Development"
  ];
}

export async function addCourseCategory(categoryName) {
  const trimmed = (categoryName || '').trim();
  if (!trimmed) return null;

  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: trimmed })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.categories) {
          localStorage.setItem('admin_course_categories', JSON.stringify(data.categories));
        }
      }
    } catch (_) {}

    const saved = localStorage.getItem('admin_course_categories');
    let list = [];
    try { list = JSON.parse(saved) || []; } catch (_) {}
    if (!list.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      list.push(trimmed);
      localStorage.setItem('admin_course_categories', JSON.stringify(list));
    }
  }

  return trimmed;
}

// --- High-level Unified REST-based Course Management API ---

/**
 * Fetch all courses (filtered or unfiltered)
 */
export async function getCourses(options = {}) {
  let locallyDeleted = [];
  if (typeof window !== 'undefined') {
    try {
      locallyDeleted = JSON.parse(localStorage.getItem('locally_deleted_courses') || '[]').map(String);
    } catch (e) {}
  }

  // 1. Instant local read for zero-latency UI rendering
  let list = null;
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('admin_courses_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          list = parsed;
        }
      }
    } catch (e) {}
  }

  // 2. Fetch authoritative courses from local Next.js server API (/api/courses)
  if (typeof window !== 'undefined') {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch('/api/courses', { signal: controller.signal }).catch(() => null);
      clearTimeout(timeoutId);

      if (res && res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.courses) && data.courses.length > 0) {
          // If local storage has newly added courses not yet on server, merge them
          if (list && Array.isArray(list)) {
            const serverIds = new Set(data.courses.map(c => String(c.id)));
            const localOnly = list.filter(c => !serverIds.has(String(c.id)));
            list = [...localOnly, ...data.courses];
          } else {
            list = data.courses;
          }
          try {
            localStorage.setItem('admin_courses_list', JSON.stringify(list));
          } catch (e) {}
        }
      }
    } catch (e) {
      console.warn('[getCourses] API fetch fallback to local:', e);
    }
  }

  // 3. Fallback to DEFAULT_COURSES if nothing is initialized yet
  if (!list || !Array.isArray(list) || list.length === 0) {
    list = DEFAULT_COURSES;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('admin_courses_list', JSON.stringify(DEFAULT_COURSES));
      } catch (e) {}
    }
  }

  // 4. Attach student enrollment counts from local storage
  let localEnrollments = [];
  if (typeof window !== 'undefined') {
    try {
      const savedEnrollments = localStorage.getItem('student_course_enrollments');
      if (savedEnrollments) {
        localEnrollments = JSON.parse(savedEnrollments);
      }
    } catch (e) {}
  }

  const localCounts = {};
  if (Array.isArray(localEnrollments)) {
    localEnrollments.forEach(e => {
      if (e && e.course) {
        localCounts[e.course] = (localCounts[e.course] || 0) + 1;
      }
    });
  }

  const preparedList = list
    .filter(c => c && !locallyDeleted.includes(String(c.id)))
    .map(c => ({
      ...c,
      enrolled: localCounts[c.id] !== undefined ? localCounts[c.id] : (c.enrolled || 0)
    }));

  return preparedList;
}

/**
 * Create a new course
 */
export async function createCourse(courseData) {
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const newCourse = {
    ...courseData,
    id: courseData.id || Date.now().toString(),
    status: courseData.status || 'Published',
    enrolled: 0,
    date: courseData.date || formattedDate
  };

  // 1. Immediately update localStorage
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('admin_courses_list') || JSON.stringify(DEFAULT_COURSES);
      let courses = JSON.parse(saved);
      courses = courses.filter(c => String(c.id) !== String(newCourse.id));
      courses.unshift(newCourse);
      localStorage.setItem('admin_courses_list', JSON.stringify(courses));
    } catch (e) {}
  }

  // 2. Persist to server API route (/api/courses)
  if (typeof window !== 'undefined') {
    try {
      fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course: newCourse })
      }).catch(err => console.warn('[createCourse] /api/courses save error:', err));
    } catch (e) {}
  }

  // 3. Broadcast update to all components and tabs
  invalidateCoursesCache();

  // 4. Background sync with Frappe if online (non-blocking)
  if (FRAPPE_URL) {
    (async () => {
      try {
        let inst = "Administrator";
        if (courseData.instructor && (courseData.instructor.includes("@") || courseData.instructor === "Administrator")) {
          inst = courseData.instructor;
        }
        const serializedDescription = JSON.stringify({
          description: courseData.description || "",
          pdf: courseData.pdf || ""
        });
        await frappeRestPost("LMS Course", {
          title: sanitizeTitle(courseData.title),
          published: newCourse.status === "Published" ? 1 : 0,
          instructors: [{ instructor: inst }],
          short_introduction: courseData.tagline || courseData.short_introduction || `${courseData.title} course introduction.`,
          description: serializedDescription,
          category: courseData.category || "Web Development",
          image: courseData.image || ""
        });
      } catch (e) {}
    })();
  }

  return newCourse;
}

/**
 * Update a course
 */
export async function updateCourse(id, courseData) {
  const strId = String(id);
  const updatedCourse = { ...courseData, id: strId };

  // 1. Immediately update localStorage
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('admin_courses_list') || JSON.stringify(DEFAULT_COURSES);
      const courses = JSON.parse(saved);
      const updated = courses.map(c => String(c.id) === strId ? { ...c, ...courseData, id: strId } : c);
      localStorage.setItem('admin_courses_list', JSON.stringify(updated));
    } catch (e) {}
  }

  // 2. Persist to server API route
  if (typeof window !== 'undefined') {
    try {
      fetch('/api/courses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: strId, course: courseData })
      }).catch(err => console.warn('[updateCourse] /api/courses error:', err));
    } catch (e) {}
  }

  // 3. Broadcast update
  invalidateCoursesCache();
  if (id) invalidateSyllabusCache(strId);

  // 4. Background sync with Frappe
  if (FRAPPE_URL) {
    (async () => {
      try {
        let inst = "Administrator";
        if (courseData.instructor && (courseData.instructor.includes("@") || courseData.instructor === "Administrator")) {
          inst = courseData.instructor;
        }
        const serializedDescription = JSON.stringify({
          description: courseData.description || "",
          pdf: courseData.pdf || ""
        });
        await frappeRestPut("LMS Course", id, {
          title: sanitizeTitle(courseData.title),
          published: (courseData.status === "Published" || courseData.status === "published") ? 1 : 0,
          category: courseData.category || undefined,
          instructors: [{ instructor: inst }],
          short_introduction: courseData.tagline || courseData.short_introduction || undefined,
          description: serializedDescription,
          image: courseData.image || ""
        });
      } catch (e) {}
    })();
  }

  return updatedCourse;
}

/**
 * Delete a course
 */
export async function deleteCourse(id) {
  const strId = String(id);

  // 1. Immediately remove from local storage state and mark deleted
  if (typeof window !== 'undefined') {
    try {
      const deleted = JSON.parse(localStorage.getItem('locally_deleted_courses') || '[]').map(String);
      if (!deleted.includes(strId)) {
        deleted.push(strId);
        localStorage.setItem('locally_deleted_courses', JSON.stringify(deleted));
      }
    } catch (e) {}

    try {
      const saved = localStorage.getItem('admin_courses_list') || JSON.stringify(DEFAULT_COURSES);
      const courses = JSON.parse(saved);
      const filtered = courses.filter(c => String(c.id) !== strId);
      localStorage.setItem('admin_courses_list', JSON.stringify(filtered));
    } catch (e) {}

    localStorage.removeItem(`admin_course_details_${strId}`);
    localStorage.removeItem(`cached_syllabus_${strId}`);
    localStorage.removeItem(`cached_syllabus_timestamp_${strId}`);
  }

  // 2. Persist delete to server API
  if (typeof window !== 'undefined') {
    try {
      fetch(`/api/courses?id=${encodeURIComponent(strId)}`, {
        method: 'DELETE'
      }).catch(err => console.warn('[deleteCourse] /api/courses error:', err));
    } catch (e) {}
  }

  // 3. Broadcast update to all tabs and listeners
  invalidateCoursesCache();
  if (id) invalidateSyllabusCache(strId);

  const isLocalCourseId = /^\d{10,}$/.test(strId) || strId.startsWith('local_') || strId.startsWith('course_');

  if (FRAPPE_URL && !isLocalCourseId) {
    try {
      // 1. Fetch and delete linked Enrollments to avoid LinkExistsError
      const enrollments = await frappeRestGet("LMS Enrollment", {
        filters: JSON.stringify([["course", "=", id]]),
        fields: JSON.stringify(["name"]),
        limit_page_length: 500
      }).catch(() => []);
      if (Array.isArray(enrollments)) {
        for (const enroll of enrollments) {
          await frappeRestDelete("LMS Enrollment", enroll.name).catch(err => {
            console.warn(`Could not delete linked LMS Enrollment ${enroll.name}:`, err);
          });
        }
      }

      // 2. Fetch and delete linked Quizzes
      const quizzes = await frappeRestGet("LMS Quiz", {
        filters: JSON.stringify([["course", "=", id]]),
        fields: JSON.stringify(["name"]),
        limit_page_length: 500
      }).catch(() => []);
      if (Array.isArray(quizzes)) {
        for (const q of quizzes) {
          await frappeRestDelete("LMS Quiz", q.name).catch(err => {
            console.warn(`Could not delete linked LMS Quiz ${q.name}:`, err);
          });
        }
      }

      // 3. Fetch and delete linked Assignments
      const assignments = await frappeRestGet("LMS Assignment", {
        filters: JSON.stringify([["course", "=", id]]),
        fields: JSON.stringify(["name"]),
        limit_page_length: 500
      }).catch(() => []);
      if (Array.isArray(assignments)) {
        for (const a of assignments) {
          await frappeRestDelete("LMS Assignment", a.name).catch(err => {
            console.warn(`Could not delete linked LMS Assignment ${a.name}:`, err);
          });
        }
      }

      // 4. Fetch and delete linked Batches
      const batches = await frappeRestGet("LMS Batch", {
        filters: JSON.stringify([["course", "=", id]]),
        fields: JSON.stringify(["name"]),
        limit_page_length: 500
      }).catch(() => []);
      if (Array.isArray(batches)) {
        for (const b of batches) {
          await frappeRestDelete("LMS Batch", b.name).catch(err => {
            console.warn(`Could not delete linked LMS Batch ${b.name}:`, err);
          });
        }
      }

      // 5. Fetch syllabus first to get chapter and lesson names
      const syllabus = await getCourseSyllabus(id).catch(() => null);
      if (syllabus && syllabus.modules) {
        // Step A: Unlink lessons from chapters
        for (const mod of syllabus.modules) {
          await frappeRestPut("Course Chapter", mod.id, { lessons: [] }).catch(err => {
            console.warn(`Failed to unlink lessons from chapter ${mod.id}:`, err);
          });
        }

        // Step B: Unlink chapters from course
        await frappeRestPut("LMS Course", id, { chapters: [] }).catch(err => {
          console.warn(`Failed to unlink chapters from course ${id}:`, err);
        });

        // Step C: Delete all Course Lessons
        for (const mod of syllabus.modules) {
          if (mod.lessons) {
            for (const les of mod.lessons) {
              await frappeRestDelete("Course Lesson", les.id).catch(err => {
                console.warn(`Could not delete Course Lesson ${les.id}:`, err);
              });
            }
          }
        }

        // Step D: Delete all Course Chapters
        for (const mod of syllabus.modules) {
          await frappeRestDelete("Course Chapter", mod.id).catch(err => {
            console.warn(`Could not delete Course Chapter ${mod.id}:`, err);
          });
        }
      }

      // Step E: Finally delete the LMS Course document itself
      await frappeRestDelete("LMS Course", id);
    } catch (e) {
      console.warn("Could not delete course via Frappe REST API (offline or unavailable). Deleted locally.", e);
    }
  }

  invalidateCoursesCache();
  return true;
}

/**
 * Fetch course syllabus outline (Chapters & Lessons) from Server API, Local Storage, or Frappe
 */
export async function getCourseSyllabus(courseId, options = {}) {
  const forceRefresh = options.forceRefresh || (typeof window !== 'undefined' && window.location.pathname.includes('/admin'));
  const now = Date.now();

  // Check in-memory cache first if not forced refresh
  if (!forceRefresh) {
    const cachedEntry = clientCache.syllabus[courseId];
    if (cachedEntry && (now - cachedEntry.timestamp < 300000)) { // 5 minutes TTL
      return cachedEntry.data;
    }
  }

  let syllabus = null;

  // 1. Try local server persistence API first (Instant and consistent across all pages and users)
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/courses/${encodeURIComponent(courseId)}/syllabus`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.modules) && data.modules.length > 0) {
          syllabus = data;
          localStorage.setItem(`admin_course_details_${courseId}`, JSON.stringify(syllabus));
        }
      }
    } catch (_) {}
  }

  // 2. Check localStorage custom syllabus outlines
  if (!syllabus && typeof window !== 'undefined') {
    const saved = localStorage.getItem(`admin_course_details_${courseId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.modules)) {
          syllabus = parsed;
          // Sync back to server API in background
          fetch(`/api/courses/${encodeURIComponent(courseId)}/syllabus`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ syllabus: parsed })
          }).catch(() => {});
        }
      } catch (_) {}
    }
  }

  // 3. Try Frappe DocTypes if online and not a local ID
  const isLocalCourseId = /^\d{10,}$/.test(String(courseId)) || String(courseId).startsWith('local_') || String(courseId).startsWith('course_');
  if (!syllabus && FRAPPE_URL && !isLocalCourseId) {
    try {
      syllabus = await Promise.race([
        frappeGet("lms.lms.api.get_course_syllabus_optimized", { course_id: courseId }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
      ]);
      if (syllabus && syllabus.error) syllabus = null;
    } catch (_) {
      syllabus = null;
    }

    if (!syllabus) {
      try {
        const courseDoc = await frappeRestGet(`LMS Course/${courseId}`);
        const chapterRefs = courseDoc.chapters || [];

        const modules = await Promise.all((chapterRefs || []).map(async (ref) => {
          try {
            const chDoc = await frappeRestGet(`Course Chapter/${ref.chapter}`);
            const lessonRefs = chDoc.lessons || [];

            const lessons = await Promise.all((lessonRefs || []).map(async (lRef) => {
              try {
                const lDoc = await frappeRestGet(`Course Lesson/${lRef.lesson}`);
                let pts = [];
                let quizQuestions = [];
                let codingExercise = { hasExercise: false };
                let pdf = "";
                if (lDoc.instructor_notes) {
                  try {
                    const meta = JSON.parse(lDoc.instructor_notes);
                    if (Array.isArray(meta.pts)) pts = meta.pts;
                    if (Array.isArray(meta.quizQuestions)) quizQuestions = meta.quizQuestions;
                    if (meta.codingExercise) codingExercise = meta.codingExercise;
                    if (meta.pdf) pdf = meta.pdf;
                  } catch (e) {}
                }
                return {
                  id: lDoc.name,
                  title: lDoc.title || lRef.lesson,
                  dur: "10 min",
                  vid: lDoc.youtube || "",
                  overview: lDoc.body || "",
                  pts,
                  quizQuestions,
                  codingExercise,
                  pdf
                };
              } catch (e) {
                const cleanTitle = lRef.lesson
                  .replace(/^(lesson-|l-)/i, '')
                  .split(/[-_]/)
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ');
                return {
                  id: lRef.lesson,
                  title: cleanTitle,
                  dur: "10 min",
                  vid: "",
                  overview: "",
                  pts: [],
                  quizQuestions: [],
                  codingExercise: { hasExercise: false },
                  pdf: ""
                };
              }
            }));

            return {
              id: chDoc.name,
              title: chDoc.title,
              emoji: "📖",
              accent: "#5B8CF8",
              lessons
            };
          } catch (err) {
            return { id: ref.chapter, title: "Untitled Chapter", emoji: "📖", accent: "#5B8CF8", lessons: [] };
          }
        }));

        syllabus = {
          id: courseId,
          title: courseDoc.title,
          tagline: courseDoc.short_introduction || "",
          modules
        };
      } catch (_) {}
    }
  }

  // 4. Default outline if completely new course
  if (!syllabus) {
    syllabus = {
      id: courseId,
      title: "Course Syllabus Outline",
      tagline: "Define modules and lessons for students.",
      modules: [
        {
          id: `${courseId}_m1`,
          title: "Introduction",
          emoji: "🚀",
          accent: "#5B8CF8",
          lessons: [
            {
              id: `${courseId}_l1`,
              title: "What is this course?",
              dur: "5 min",
              vid: "",
              overview: "Welcome to the course. Here is a brief explanation of what we will cover.",
              pts: ["Course overview", "Course requirements"],
              quizQuestions: [],
              codingExercise: {
                hasExercise: false,
                language: 'python',
                instruction: '',
                starterCode: '',
                solutionCode: '',
                testCases: []
              },
              pdf: ""
            }
          ]
        }
      ]
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem(`admin_course_details_${courseId}`, JSON.stringify(syllabus));
      fetch(`/api/courses/${encodeURIComponent(courseId)}/syllabus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syllabus })
      }).catch(() => {});
    }
  }

  // Cache in memory and localStorage
  clientCache.syllabus[courseId] = {
    data: syllabus,
    timestamp: Date.now()
  };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`cached_syllabus_${courseId}`, JSON.stringify(syllabus));
      localStorage.setItem(`cached_syllabus_timestamp_${courseId}`, String(Date.now()));
    } catch (_) {}
  }

  return syllabus;
}

function cleanYoutubeVid(input) {
  if (!input || typeof input !== 'string') return '';
  const str = input.trim();
  if (!str) return '';
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return str;
  const match = str.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?.*v=|shorts\/|live\/))([a-zA-Z0-9_-]{11})/);
  if (match && match[1]) return match[1];
  try {
    const urlObj = new URL(str.startsWith('http') ? str : `https://${str}`);
    const vParam = urlObj.searchParams.get('v');
    if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) return vParam;
  } catch (e) {}
  const tokenMatch = str.match(/([a-zA-Z0-9_-]{11})/);
  if (tokenMatch && tokenMatch[1]) return tokenMatch[1];
  return str;
}

/**
 * Save course syllabus outline to Frappe DocTypes or Local Storage
 */
export async function saveCourseSyllabus(courseId, syllabus) {
  // 1. Immediately persist to server API (permanent across browsers and reloads)
  if (typeof window !== 'undefined') {
    try {
      await fetch(`/api/courses/${encodeURIComponent(courseId)}/syllabus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syllabus }),
        cache: 'no-store'
      });
    } catch (apiErr) {
      console.warn("Failed to persist syllabus to server API:", apiErr);
    }

    // 2. Persist to localStorage
    localStorage.setItem(`admin_course_details_${courseId}`, JSON.stringify(syllabus));
    localStorage.setItem(`cached_syllabus_${courseId}`, JSON.stringify(syllabus));
    localStorage.setItem(`cached_syllabus_timestamp_${courseId}`, String(Date.now()));

    // Update lesson count in cached course list
    try {
      const saved = localStorage.getItem('admin_courses_list');
      if (saved) {
        const courses = JSON.parse(saved);
        const totalLessons = (syllabus.modules || []).reduce((acc, m) => acc + (m.lessons ? m.lessons.length : 0), 0);
        const updated = courses.map(c => String(c.id) === String(courseId) ? { ...c, lessonsCount: totalLessons } : c);
        localStorage.setItem('admin_courses_list', JSON.stringify(updated));
      }
    } catch (_) {}
  }

  // 3. Update memory cache
  clientCache.syllabus[courseId] = {
    data: syllabus,
    timestamp: Date.now()
  };

  // 4. Try syncing to Frappe DocTypes in background (non-blocking, tolerant of 503)
  const isLocalCourseId = /^\d{10,}$/.test(String(courseId)) || String(courseId).startsWith('local_') || String(courseId).startsWith('course_');
  if (FRAPPE_URL && !isLocalCourseId) {
    (async () => {
      try {
        for (const chapter of syllabus.modules) {
          const lessonsList = [];
          for (const lesson of chapter.lessons || []) {
            const cleanVid = cleanYoutubeVid(lesson.vid);
            const notesStr = JSON.stringify({
              pts: lesson.pts || ["Key concept introduction."],
              quizQuestions: lesson.quizQuestions || [],
              codingExercise: lesson.codingExercise || { hasExercise: false },
              pdf: lesson.pdf || ""
            });

            const lRes = await Promise.race([
              frappePost("lms.lms.api.save_course_lesson_custom", {
                lesson_id: lesson.id,
                title: sanitizeTitle(lesson.title),
                chapter_id: chapter.id,
                youtube: cleanVid,
                body: lesson.overview,
                instructor_notes: notesStr,
                user_email: getActiveUserId()
              }),
              new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
            ]);

            if (lRes && lRes.status === "success" && lRes.name) {
              lessonsList.push(lRes.name);
            }
          }

          await Promise.race([
            frappePost("lms.lms.api.save_course_chapter_custom", {
              chapter_id: chapter.id,
              title: sanitizeTitle(chapter.title),
              course: courseId,
              lessons: lessonsList.map(lId => ({ lesson: lId })),
              user_email: getActiveUserId()
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
          ]);
        }
      } catch (e) {
        console.warn("Background Frappe sync skipped (Frappe offline/suspended).");
      }
    })();
  }

  return syllabus;
}

/**
 * Real backend authenticated login
 */
export async function login(email, password) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!FRAPPE_URL) {
    if (normalizedEmail === 'admin@lms.com' && password === 'admin123') {
      return { email: normalizedEmail, username: 'Administrator', name: 'Administrator', role: 'Administrator' };
    }
    if (normalizedEmail === 'student@lms.com' && password === 'student123') {
      return { email: normalizedEmail, username: normalizedEmail, name: 'Student', role: 'Student' };
    }
    const studentMatch = normalizedEmail.match(/^student([1-5])@lms\.com$/);
    if (studentMatch && password === 'student123') {
      const idx = parseInt(studentMatch[1], 10);
      const studentNames = ['Aarav Mehta', 'Sneha Patel', 'Rohan Sharma', 'Priya Nair', 'Aditya Rao'];
      return {
        email: normalizedEmail,
        username: normalizedEmail,
        name: studentNames[idx - 1],
        role: 'Student'
      };
    }
    throw new Error("Invalid credentials");
  }

  // Map admin@lms.com to backend seed user
  let usr = email;
  let pwd = password;
  if (normalizedEmail === 'admin@lms.com' && password === 'admin123') {
    usr = 'Administrator';
    pwd = 'admin';
  }

  try {
    const res = await fetch(`${FRAPPE_URL}/api/method/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usr, pwd })
    });

    const data = await res.json();
    if (res.ok && (data.message === "Logged In" || data.message === "No App")) {
      if (typeof window !== 'undefined' && data.sid) {
        localStorage.setItem('frappe_sid', data.sid);
      }
      return {
        email: data.user_id || usr,
        username: data.user_id || usr,
        name: data.full_name || usr,
        role: usr === 'Administrator' ? 'Administrator' : 'Student'
      };
    } else {
      throw new Error(data.message || "Invalid credentials");
    }
  } catch (err) {
    // If the backend request fails (e.g. connection refused), fall back to local credentials
    if (normalizedEmail === 'admin@lms.com' && password === 'admin123') {
      return {
        email: normalizedEmail,
        username: 'Administrator',
        name: 'Administrator',
        role: 'Administrator'
      };
    }
    if (normalizedEmail === 'student@lms.com' && password === 'student123') {
      return { email: normalizedEmail, username: normalizedEmail, name: 'Student', role: 'Student' };
    }
    const studentMatch = normalizedEmail.match(/^student([1-5])@lms\.com$/);
    if (studentMatch && password === 'student123') {
      const idx = parseInt(studentMatch[1], 10);
      const studentNames = ['Aarav Mehta', 'Sneha Patel', 'Rohan Sharma', 'Priya Nair', 'Aditya Rao'];
      return {
        email: normalizedEmail,
        username: normalizedEmail,
        name: studentNames[idx - 1],
        role: 'Student'
      };
    }
    throw err;
  }
}

// --- LMS Batch API ---

const DEFAULT_BATCHES = [
  { id: '1', title: 'Python Cohort - Summer 2026', start_date: '2026-06-01', end_date: '2026-08-31', medium: 'Online', seat_count: 50, published: true, amount: 199, currency: 'USD' },
  { id: '2', title: 'Data Structures Intensive - Q3', start_date: '2026-07-15', end_date: '2026-09-15', medium: 'Offline', seat_count: 25, published: true, amount: 299, currency: 'USD' },
  { id: '3', title: 'ML/AI Boot Camp', start_date: '2026-09-01', end_date: '2026-12-15', medium: 'Online', seat_count: 100, published: false, amount: 499, currency: 'USD' }
];

export async function getBatches() {
  if (FRAPPE_URL) {
    try {
      const batches = await frappeRestGet("LMS Batch", {
        fields: JSON.stringify(["name", "title", "start_date", "end_date", "medium", "seat_count", "published", "amount", "currency"]),
        limit_page_length: 100
      });
      return batches.map(b => ({
        id: b.name,
        title: b.title,
        start_date: b.start_date,
        end_date: b.end_date,
        medium: b.medium || 'Online',
        seat_count: b.seat_count || 0,
        published: !!b.published,
        amount: b.amount || 0,
        currency: b.currency || 'USD'
      }));
    } catch (e) {
      console.error("Failed to fetch batches. Falling back to local state.", e);
    }
  }

  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('admin_batches_list');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    localStorage.setItem('admin_batches_list', JSON.stringify(DEFAULT_BATCHES));
    return DEFAULT_BATCHES;
  }
  return DEFAULT_BATCHES;
}

export async function createBatch(batchData) {
  if (FRAPPE_URL) {
    try {
      const result = await frappeRestPost("LMS Batch", {
        title: batchData.title,
        start_date: batchData.start_date,
        end_date: batchData.end_date,
        medium: batchData.medium || 'Online',
        seat_count: parseInt(batchData.seat_count) || 0,
        published: batchData.published ? 1 : 0,
        amount: parseFloat(batchData.amount) || 0,
        currency: batchData.currency || 'USD',
        // Add defaults for required fields in the backend
        start_time: batchData.start_time || "09:00:00",
        end_time: batchData.end_time || "18:00:00",
        timezone: batchData.timezone || "Asia/Kolkata",
        description: batchData.description || `${batchData.title} batch cohort.`,
        batch_details: batchData.batch_details || `${batchData.title} batch details.`,
        instructors: [{ instructor: "Administrator" }]
      });
      return { ...batchData, id: result.name };
    } catch (e) {
      console.warn("Notice: Frappe REST API unavailable for createBatch. Falling back to local state.", e.message || e);
    }
  }

  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('admin_batches_list') || JSON.stringify(DEFAULT_BATCHES);
    const list = JSON.parse(saved);
    const newBatch = { ...batchData, id: Date.now().toString() };
    list.unshift(newBatch);
    localStorage.setItem('admin_batches_list', JSON.stringify(list));
    return newBatch;
  }
  return batchData;
}

export async function updateBatch(id, batchData) {
  if (FRAPPE_URL) {
    try {
      await frappeRestPut("LMS Batch", id, {
        title: batchData.title,
        start_date: batchData.start_date,
        end_date: batchData.end_date,
        medium: batchData.medium,
        seat_count: parseInt(batchData.seat_count) || 0,
        published: batchData.published ? 1 : 0,
        amount: parseFloat(batchData.amount) || 0,
        currency: batchData.currency,
        // Optional updates/defaults
        start_time: batchData.start_time || "09:00:00",
        end_time: batchData.end_time || "18:00:00",
        timezone: batchData.timezone || "Asia/Kolkata",
        description: batchData.description || `${batchData.title} batch cohort.`,
        batch_details: batchData.batch_details || `${batchData.title} batch details.`,
        instructors: [{ instructor: "Administrator" }]
      });
      return batchData;
    } catch (e) {
      console.warn("Notice: Frappe REST API unavailable for updateBatch. Falling back to local state.", e.message || e);
    }
  }

  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('admin_batches_list') || JSON.stringify(DEFAULT_BATCHES);
    const list = JSON.parse(saved);
    const updated = list.map(b => b.id === id ? { ...b, ...batchData } : b);
    localStorage.setItem('admin_batches_list', JSON.stringify(updated));
    return batchData;
  }
  return batchData;
}

export async function deleteBatch(id) {
  if (FRAPPE_URL) {
    try {
      await frappeRestDelete("LMS Batch", id);
      return true;
    } catch (e) {
      console.error("Failed to delete batch.", e);
    }
  }

  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('admin_batches_list') || JSON.stringify(DEFAULT_BATCHES);
    const list = JSON.parse(saved);
    const filtered = list.filter(b => b.id !== id);
    localStorage.setItem('admin_batches_list', JSON.stringify(filtered));
    return true;
  }
  return false;
}

/**
 * Enroll a student in a course
 */
export async function enrollStudentInCourse(courseId, studentEmail) {
  invalidateCoursesCache();
  if (FRAPPE_URL) {
    try {
      return await frappeRestPost("LMS Enrollment", {
        course: courseId,
        member: studentEmail
      });
    } catch (e) {
      console.error("Failed to enroll via Frappe REST API. Falling back to local state.", e);
    }
  }

  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('student_course_enrollments') || '[]';
    let enrollments = [];
    try {
      enrollments = JSON.parse(saved);
    } catch (e) {}

    const exists = enrollments.some(e => e.course === courseId && e.member === studentEmail);
    if (!exists) {
      enrollments.push({ course: courseId, member: studentEmail });
      localStorage.setItem('student_course_enrollments', JSON.stringify(enrollments));
    }
    return true;
  }
  return false;
}

/**
 * Check if a student is enrolled in a course
 */
export async function checkStudentEnrollment(courseId, studentEmail) {
  if (!studentEmail) return false;

  if (FRAPPE_URL) {
    try {
      const res = await frappeRestGet("LMS Enrollment", {
        fields: JSON.stringify(["name"]),
        filters: JSON.stringify([
          ["course", "=", courseId],
          ["member", "=", studentEmail]
        ])
      });
      return res && res.length > 0;
    } catch (e) {
      console.error("Failed to check enrollment via Frappe REST API. Falling back to local state.", e);
    }
  }

  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('student_course_enrollments') || '[]';
    let enrollments = [];
    try {
      enrollments = JSON.parse(saved);
    } catch (e) {}

    return enrollments.some(e => e.course === courseId && e.member === studentEmail);
  }
  return false;
}

/**
 * Get all course IDs a student is enrolled in
 */
export async function getStudentEnrollments(studentEmail) {
  if (!studentEmail) return [];

  let local = [];
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('student_course_enrollments') || '[]';
      const enrollments = JSON.parse(saved);
      local = enrollments.filter(e => e && e.member === studentEmail).map(e => e.course);
    } catch (e) {}
  }

  if (local.length > 0) return local;

  if (FRAPPE_URL) {
    try {
      const res = await frappeRestGet("LMS Enrollment", {
        fields: JSON.stringify(["course"]),
        filters: JSON.stringify([
          ["member", "=", studentEmail]
        ]),
        limit_page_length: 100
      });
      return (res || []).map(e => e.course);
    } catch (e) {
      console.warn("Failed to fetch student enrollments via Frappe REST API. Falling back to local state.", e);
    }
  }

  return local;
}

// --- LMS Quiz API ---

const DEFAULT_QUIZZES = [
  {
    id: 'quiz-python-intro',
    title: 'Python Syntax & Variables Quiz',
    course: '1',
    lesson: 'l2',
    max_attempts: 3,
    passing_percentage: 75,
    total_marks: 10,
    duration: '10 mins',
    questions: [
      { question: 'Which keyword is used to define a function in Python?', options: ['func', 'define', 'def', 'function'], correct: 2 },
      { question: 'What is the output of type(10.5)?', options: ['<class \'int\'>', '<class \'float\'>', '<class \'str\'>', '<class \'double\'>'], correct: 1 }
    ]
  },
  {
    id: 'quiz-dsa-trees',
    title: 'Binary Tree Operations Quiz',
    course: '2',
    lesson: 'l1',
    max_attempts: 2,
    passing_percentage: 80,
    total_marks: 20,
    duration: '15 mins',
    questions: [
      { question: 'What is the time complexity of searching in a Balanced Binary Search Tree?', options: ['O(1)', 'O(n)', 'O(log n)', 'O(n log n)'], correct: 2 }
    ]
  }
];

export async function getQuizzes() {
  // 1. Try local server API first (instant, persistent across reloads and users)
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/quizzes', { cache: 'no-store' });
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) {
          localStorage.setItem('admin_quizzes_list', JSON.stringify(list));
          return list;
        }
      }
    } catch (_) {}
  }

  // 2. Try Frappe LMS backend if configured
  if (FRAPPE_URL) {
    try {
      const quizzes = await frappeRestGet("LMS Quiz", {
        fields: JSON.stringify(["name", "title", "course", "lesson", "max_attempts", "passing_percentage", "total_marks", "duration"]),
        limit_page_length: 100
      });
      // Fetch detailed questions for each quiz
      const detailedQuizzes = await Promise.all((quizzes || []).map(async (q) => {
        try {
          const detailed = await frappeRestGet(`LMS Quiz/${q.name}`);
          const questionsList = await Promise.all((detailed.questions || []).map(async (ref) => {
            try {
              const qDoc = await frappeRestGet(`LMS Question/${ref.question}`);
              const options = [];
              if (qDoc.option_1) options.push(qDoc.option_1);
              if (qDoc.option_2) options.push(qDoc.option_2);
              if (qDoc.option_3) options.push(qDoc.option_3);
              if (qDoc.option_4) options.push(qDoc.option_4);
              
              let correct = 0;
              if (qDoc.is_correct_1) correct = 0;
              else if (qDoc.is_correct_2) correct = 1;
              else if (qDoc.is_correct_3) correct = 2;
              else if (qDoc.is_correct_4) correct = 3;
              
              return {
                id: qDoc.name,
                question: qDoc.question,
                options,
                correct
              };
            } catch (err) {
              return {
                id: ref.name,
                question: ref.question_detail || "Question details unavailable",
                options: ["True", "False"],
                correct: 0
              };
            }
          }));
          return {
            id: detailed.name,
            title: detailed.title,
            course: detailed.course,
            lesson: detailed.lesson,
            max_attempts: detailed.max_attempts || 3,
            passing_percentage: detailed.passing_percentage || 70,
            total_marks: detailed.total_marks || 10,
            duration: detailed.duration || '10 mins',
            questions: questionsList.filter(Boolean)
          };
        } catch (err) {
          return {
            id: q.name,
            title: q.title,
            course: q.course,
            lesson: q.lesson,
            max_attempts: q.max_attempts || 3,
            passing_percentage: q.passing_percentage || 70,
            total_marks: q.total_marks || 10,
            duration: q.duration || '10 mins',
            questions: []
          };
        }
      }));
      if (detailedQuizzes && detailedQuizzes.length > 0) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('admin_quizzes_list', JSON.stringify(detailedQuizzes));
        }
        return detailedQuizzes;
      }
    } catch (e) {
      console.warn("Notice: Frappe quizzes API unavailable. Falling back to local state.", e.message || e);
    }
  }

  // 3. Fallback to localStorage or default quizzes
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('admin_quizzes_list');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    localStorage.setItem('admin_quizzes_list', JSON.stringify(DEFAULT_QUIZZES));
    return DEFAULT_QUIZZES;
  }
  return DEFAULT_QUIZZES;
}

export async function createQuiz(quizData) {
  const payload = {
    ...quizData,
    id: quizData.id || ('quiz-' + Date.now()),
    questions: quizData.questions || []
  };

  // 1. Persist to local server API (/api/quizzes)
  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quiz: payload })
      });
    } catch (_) {}

    // 2. Persist to localStorage
    const saved = localStorage.getItem('admin_quizzes_list') || JSON.stringify(DEFAULT_QUIZZES);
    try {
      const list = JSON.parse(saved);
      const existingIdx = list.findIndex(q => q.id === payload.id);
      if (existingIdx >= 0) {
        list[existingIdx] = { ...list[existingIdx], ...payload };
      } else {
        list.unshift(payload);
      }
      localStorage.setItem('admin_quizzes_list', JSON.stringify(list));
    } catch (_) {}
  }

  // 3. Optional Frappe background sync (fire-and-forget, never throws to caller)
  if (FRAPPE_URL) {
    (async () => {
      try {
        const questionsRefs = [];
        const qs = quizData.questions || [];
        for (const q of qs) {
          const qDoc = await frappeRestPost("LMS Question", {
            question: q.question,
            type: "Choices",
            multiple: 0,
            option_1: q.options?.[0] || "",
            is_correct_1: q.correct === 0 ? 1 : 0,
            option_2: q.options?.[1] || "",
            is_correct_2: q.correct === 1 ? 1 : 0,
            option_3: q.options?.[2] || "",
            is_correct_3: q.correct === 2 ? 1 : 0,
            option_4: q.options?.[3] || "",
            is_correct_4: q.correct === 3 ? 1 : 0,
          });
          questionsRefs.push({
            question: qDoc.name,
            marks: 5,
            question_detail: q.question,
            type: "Choices"
          });
        }

        const frappePayload = {
          title: quizData.title,
          course: quizData.course,
          lesson: quizData.lesson || undefined,
          max_attempts: parseInt(quizData.max_attempts) || 3,
          passing_percentage: parseInt(quizData.passing_percentage) || 70,
          total_marks: parseInt(quizData.total_marks) || 10,
          duration: quizData.duration || '10 mins',
          questions: questionsRefs
        };

        try {
          await frappeRestPost("LMS Quiz", frappePayload);
        } catch (err) {
          if (err.message && err.message.includes("Could not find Lesson")) {
            delete frappePayload.lesson;
            await frappeRestPost("LMS Quiz", frappePayload);
          }
        }
      } catch (e) {
        console.warn("Notice: Frappe background sync for quiz deferred or offline:", e.message || e);
      }
    })();
  }

  return payload;
}

export async function updateQuiz(id, quizData) {
  const payload = {
    ...quizData,
    id,
    questions: quizData.questions || []
  };

  // 1. Persist to server API (/api/quizzes)
  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quiz: payload })
      });
    } catch (_) {}

    // 2. Persist to localStorage
    const saved = localStorage.getItem('admin_quizzes_list') || JSON.stringify(DEFAULT_QUIZZES);
    try {
      const list = JSON.parse(saved);
      const updated = list.map(q => q.id === id ? { ...q, ...payload } : q);
      localStorage.setItem('admin_quizzes_list', JSON.stringify(updated));
    } catch (_) {}
  }

  // 3. Optional Frappe sync (fire-and-forget, never throws)
  if (FRAPPE_URL) {
    (async () => {
      try {
        const questionsRefs = [];
        const qs = quizData.questions || [];
        for (const q of qs) {
          let qName = q.id;
          const qPayload = {
            question: q.question,
            type: "Choices",
            multiple: 0,
            option_1: q.options?.[0] || "",
            is_correct_1: q.correct === 0 ? 1 : 0,
            option_2: q.options?.[1] || "",
            is_correct_2: q.correct === 1 ? 1 : 0,
            option_3: q.options?.[2] || "",
            is_correct_3: q.correct === 2 ? 1 : 0,
            option_4: q.options?.[3] || "",
            is_correct_4: q.correct === 3 ? 1 : 0,
          };

          try {
            if (qName && !qName.startsWith("q_") && !qName.startsWith("quiz-")) {
              await frappeRestPut("LMS Question", qName, qPayload);
            } else {
              const qDoc = await frappeRestPost("LMS Question", qPayload);
              qName = qDoc.name;
            }
          } catch (qErr) {
            const qDoc = await frappeRestPost("LMS Question", qPayload);
            qName = qDoc.name;
          }

          questionsRefs.push({
            question: qName,
            marks: 5,
            question_detail: q.question,
            type: "Choices"
          });
        }

        const updatePayload = {
          title: quizData.title,
          course: quizData.course,
          lesson: quizData.lesson || null,
          max_attempts: parseInt(quizData.max_attempts) || 3,
          passing_percentage: parseInt(quizData.passing_percentage) || 70,
          total_marks: parseInt(quizData.total_marks) || 10,
          duration: quizData.duration,
          questions: questionsRefs
        };

        try {
          await frappeRestPut("LMS Quiz", id, updatePayload);
        } catch (err) {
          if (err.message && err.message.includes("Could not find Lesson")) {
            updatePayload.lesson = null;
            await frappeRestPut("LMS Quiz", id, updatePayload);
          } else {
            await frappeRestPost("LMS Quiz", updatePayload);
          }
        }
      } catch (e) {
        console.warn("Notice: Frappe background sync for quiz update deferred or offline:", e.message || e);
      }
    })();
  }

  return payload;
}

export async function deleteQuiz(id) {
  // 1. Delete from server API
  if (typeof window !== 'undefined') {
    try {
      await fetch(`/api/quizzes?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (_) {}

    // 2. Delete from localStorage
    const saved = localStorage.getItem('admin_quizzes_list') || JSON.stringify(DEFAULT_QUIZZES);
    try {
      const list = JSON.parse(saved);
      const filtered = list.filter(q => q.id !== id);
      localStorage.setItem('admin_quizzes_list', JSON.stringify(filtered));
    } catch (_) {}
  }

  // 3. Optional Frappe sync
  if (FRAPPE_URL) {
    (async () => {
      try {
        await Promise.race([
          frappeRestDelete("LMS Quiz", id),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
        ]);
      } catch (_) {}
    })();
  }

  return true;
}

// --- LMS Quiz Submission API ---

export async function getQuizSubmissions() {
  if (FRAPPE_URL) {
    try {
      return await frappeRestGet("LMS Quiz Submission", {
        fields: JSON.stringify(["name", "quiz", "quiz_title", "course", "member", "member_name", "score", "score_out_of", "percentage", "passing_percentage"]),
        limit_page_length: 100
      });
    } catch (e) {
      console.error("Failed to fetch quiz submissions.", e);
    }
  }
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('quiz_submissions');
    return saved ? JSON.parse(saved) : [];
  }
  return [];
}

export async function submitQuizResponse(subData) {
  if (FRAPPE_URL) {
    try {
      return await frappeRestPost("LMS Quiz Submission", {
        quiz: subData.quiz,
        quiz_title: subData.quiz_title,
        course: subData.course,
        member: subData.member,
        member_name: subData.member_name,
        score: subData.score,
        score_out_of: subData.score_out_of,
        percentage: subData.percentage,
        passing_percentage: subData.passing_percentage
      });
    } catch (e) {
      console.error("Failed to upload quiz submission.", e);
    }
  }
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('quiz_submissions') || '[]';
    const list = JSON.parse(saved);
    const newSub = { ...subData, id: 'sub-' + Date.now(), timestamp: new Date().toISOString() };
    list.unshift(newSub);
    localStorage.setItem('quiz_submissions', JSON.stringify(list));
    return newSub;
  }
  return subData;
}

// --- LMS Assignment API ---

// Local metadata helpers for custom assignment fields not in standard Frappe schema
function getAssignmentMetadata(assId) {
  if (typeof window === 'undefined') return {};
  try {
    const store = JSON.parse(localStorage.getItem('assignment_criteria_store') || '{}');
    return store[assId] || {};
  } catch (e) { return {}; }
}

function setAssignmentMetadata(assId, meta) {
  if (typeof window === 'undefined') return;
  try {
    const store = JSON.parse(localStorage.getItem('assignment_criteria_store') || '{}');
    store[assId] = { ...(store[assId] || {}), ...meta };
    localStorage.setItem('assignment_criteria_store', JSON.stringify(store));
  } catch (e) {}
}

function getStoredAiEval(subId) {
  if (typeof window === 'undefined') return null;
  try {
    const store = JSON.parse(localStorage.getItem('submission_ai_store') || '{}');
    return store[subId] || null;
  } catch (e) { return null; }
}

function setStoredAiEval(subId, score, aiEval) {
  if (typeof window === 'undefined') return;
  try {
    const store = JSON.parse(localStorage.getItem('submission_ai_store') || '{}');
    store[subId] = { score, ai_evaluation: aiEval };
    localStorage.setItem('submission_ai_store', JSON.stringify(store));
  } catch (e) {}
}

const DEFAULT_ASSIGNMENTS = [
  {
    id: 'assign-python-fibonacci',
    title: 'Implementing Fibonacci Sequence Generator',
    course: '1',
    courseTitle: 'Python Fundamentals',
    chapter: '1_m1',
    chapterTitle: 'Introduction',
    type: 'Text',
    question: '<p>Write a Python function <code>fibonacci(n)</code> that returns the first <code>n</code> Fibonacci numbers as a list. Hand in the source code file or code text.</p>',
    show_answer: true,
    answer: 'def fibonacci(n):\n    if n <= 0: return []\n    if n == 1: return [0]\n    seq = [0, 1]\n    while len(seq) < n:\n        seq.append(seq[-1] + seq[-2])\n    return seq',
    evaluation_criteria: [
      'Function named fibonacci(n) returning a list',
      'Handles edge cases n <= 0 and n == 1 correctly',
      'Uses loop or recursion to build correct sequence',
      'Time complexity O(N) or efficient execution'
    ],
    pass_threshold: 70,
    min_char_count: 20,
    questions: [
      {
        id: 1,
        prompt: '<p>Write a Python function <code>fibonacci(n)</code> that returns the first <code>n</code> Fibonacci numbers as a list.</p>',
        sample_answer: 'def fibonacci(n):\n    if n <= 0: return []\n    if n == 1: return [0]\n    seq = [0, 1]\n    while len(seq) < n:\n        seq.append(seq[-1] + seq[-2])\n    return seq'
      }
    ]
  },
  {
    id: 'assign-dsa-sorting',
    title: 'Custom Merge Sort Complexity Analysis',
    course: '2',
    courseTitle: 'Data Structures & Algorithms',
    chapter: '2_m1',
    chapterTitle: 'Sorting Algorithms',
    type: 'PDF',
    question: '<p>Compare the computational complexity and space requirements of Merge Sort and In-place Quicksort. Submit a PDF report explaining edge cases.</p>',
    show_answer: false,
    answer: '',
    evaluation_criteria: [
      'Accurate comparison of Time Complexity (Best, Average, Worst)',
      'Detailed explanation of Space Complexity differences',
      'Discussion of stability and real-world trade-offs',
      'Edge cases (duplicate elements, sorted array, empty array)'
    ],
    pass_threshold: 75,
    min_char_count: 20,
    questions: [
      {
        id: 1,
        prompt: '<p>Compare the computational complexity and space requirements of Merge Sort and In-place Quicksort. Submit a PDF report explaining edge cases.</p>',
        sample_answer: ''
      }
    ]
  }
];

export function parseQuestionsList(questionStr, extraQuestions, defaultAnswer) {
  if (Array.isArray(extraQuestions) && extraQuestions.length > 0) {
    return extraQuestions;
  }
  if (!questionStr) return [{ id: 1, prompt: '', sample_answer: defaultAnswer || '' }];

  const regex = /(?:Question\s+(\d+)[:\.-]?\s*)/gi;
  const matches = [...questionStr.matchAll(regex)];

  if (matches.length > 1) {
    const parsed = [];
    for (let i = 0; i < matches.length; i++) {
      const startIndex = matches[i].index + matches[i][0].length;
      const endIndex = (i + 1 < matches.length) ? matches[i + 1].index : questionStr.length;
      const promptText = questionStr.substring(startIndex, endIndex).trim();
      if (promptText) {
        parsed.push({
          id: i + 1,
          prompt: promptText,
          sample_answer: ''
        });
      }
    }
    if (parsed.length > 0) return parsed;
  }

  return [{ id: 1, prompt: questionStr, sample_answer: defaultAnswer || '' }];
}

export async function getAssignments(filterParams = {}) {
  // 1. Try local server API first (instant, persistent across reloads and users)
  if (typeof window !== 'undefined') {
    try {
      const query = new URLSearchParams(filterParams).toString();
      const res = await fetch(`/api/assignments${query ? '?' + query : ''}`, { cache: 'no-store' });
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) {
          localStorage.setItem('admin_assignments_list', JSON.stringify(list));
          return list.map(a => {
            const extra = getAssignmentMetadata(a.id);
            const resolvedQuestions = parseQuestionsList(a.question || '', extra.questions || a.questions, a.answer);
            return {
              ...a,
              evaluation_criteria: extra.evaluation_criteria || a.evaluation_criteria || [],
              pass_threshold: extra.pass_threshold || a.pass_threshold || 70,
              min_char_count: extra.min_char_count !== undefined ? extra.min_char_count : (a.min_char_count !== undefined ? a.min_char_count : 20),
              questions: resolvedQuestions
            };
          });
        }
      }
    } catch (_) {}
  }

  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('admin_assignments_list');
    if (saved) {
      try {
        const list = JSON.parse(saved);
        return list.map(a => {
          const extra = getAssignmentMetadata(a.id);
          const resolvedQuestions = parseQuestionsList(a.question || '', extra.questions || a.questions, a.answer);
          return {
            ...a,
            evaluation_criteria: extra.evaluation_criteria || a.evaluation_criteria || [],
            pass_threshold: extra.pass_threshold || a.pass_threshold || 70,
            min_char_count: extra.min_char_count !== undefined ? extra.min_char_count : (a.min_char_count !== undefined ? a.min_char_count : 20),
            questions: resolvedQuestions
          };
        });
      } catch (e) {}
    }
    localStorage.setItem('admin_assignments_list', JSON.stringify(DEFAULT_ASSIGNMENTS));
    return DEFAULT_ASSIGNMENTS;
  }
  return DEFAULT_ASSIGNMENTS;
}

export async function createAssignment(assignmentData) {
  const combinedQuestion = (assignmentData.questions && assignmentData.questions.length > 0)
    ? assignmentData.questions.map((q, idx) => `Question ${idx + 1}: ${q.prompt}`).join('\n\n')
    : (assignmentData.question || 'Assignment prompt details.');

  const payload = {
    ...assignmentData,
    id: assignmentData.id || `assign-${Date.now()}`,
    question: combinedQuestion
  };

  // 1. Persist to server API
  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignment: payload })
      });
    } catch (_) {}

    // 2. Persist to localStorage
    const saved = localStorage.getItem('admin_assignments_list') || JSON.stringify(DEFAULT_ASSIGNMENTS);
    try {
      const list = JSON.parse(saved);
      list.unshift(payload);
      localStorage.setItem('admin_assignments_list', JSON.stringify(list));
    } catch (_) {}

    setAssignmentMetadata(payload.id, {
      evaluation_criteria: assignmentData.evaluation_criteria || [],
      pass_threshold: assignmentData.pass_threshold || 70,
      min_char_count: assignmentData.min_char_count !== undefined ? assignmentData.min_char_count : 20,
      questions: assignmentData.questions || [],
      custom_course_title: assignmentData.custom_course_title || ''
    });
  }

  // 3. Optional Frappe background sync
  if (FRAPPE_URL) {
    (async () => {
      try {
        await Promise.race([
          frappeRestPost("LMS Assignment", {
            title: payload.title,
            type: payload.type || 'Text',
            course: payload.course,
            question: combinedQuestion,
            show_answer: payload.show_answer ? 1 : 0,
            answer: payload.answer || ''
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
        ]);
      } catch (_) {}
    })();
  }

  return payload;
}

export async function updateAssignment(id, assignmentData) {
  const combinedQuestion = (assignmentData.questions && assignmentData.questions.length > 0)
    ? assignmentData.questions.map((q, idx) => `Question ${idx + 1}: ${q.prompt}`).join('\n\n')
    : (assignmentData.question || 'Assignment prompt details.');

  const payload = {
    ...assignmentData,
    id,
    question: combinedQuestion
  };

  // 1. Persist to server API
  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignment: payload })
      });
    } catch (_) {}

    // 2. Persist to localStorage
    const saved = localStorage.getItem('admin_assignments_list') || JSON.stringify(DEFAULT_ASSIGNMENTS);
    try {
      const list = JSON.parse(saved);
      const updated = list.map(a => a.id === id ? { ...a, ...payload } : a);
      localStorage.setItem('admin_assignments_list', JSON.stringify(updated));
    } catch (_) {}

    setAssignmentMetadata(id, {
      evaluation_criteria: assignmentData.evaluation_criteria || [],
      pass_threshold: assignmentData.pass_threshold || 70,
      min_char_count: assignmentData.min_char_count !== undefined ? assignmentData.min_char_count : 20,
      questions: assignmentData.questions || [],
      custom_course_title: assignmentData.custom_course_title || ''
    });
  }

  return payload;
}

export async function deleteAssignment(id) {
  if (typeof window !== 'undefined') {
    try {
      await fetch(`/api/assignments?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (_) {}

    const saved = localStorage.getItem('admin_assignments_list') || JSON.stringify(DEFAULT_ASSIGNMENTS);
    try {
      const list = JSON.parse(saved);
      const filtered = list.filter(a => a.id !== id);
      localStorage.setItem('admin_assignments_list', JSON.stringify(filtered));
    } catch (_) {}
  }

  if (FRAPPE_URL) {
    (async () => {
      try {
        await Promise.race([
          frappeRestDelete("LMS Assignment", id),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
        ]);
      } catch (_) {}
    })();
  }

  return true;
}

// --- LMS Assignment Submission API ---

export async function getAssignmentSubmissions() {
  if (FRAPPE_URL) {
    try {
      const res = await frappeRestGet("LMS Assignment Submission", {
        fields: JSON.stringify(["name", "assignment", "assignment_title", "type", "member", "member_name", "evaluator", "assignment_attachment", "answer", "status", "question", "comments", "course", "lesson"]),
        limit_page_length: 100
      });
      return (res || []).map(s => {
        const extra = getStoredAiEval(s.name) || {};
        return {
          id: s.name,
          ...s,
          score: extra.score !== undefined ? extra.score : s.score,
          ai_evaluation: extra.ai_evaluation || s.ai_evaluation || null
        };
      });
    } catch (e) {
      console.error("Failed to fetch assignment submissions.", e);
    }
  }
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('assignment_submissions');
    return saved ? JSON.parse(saved) : [];
  }
  return [];
}

export async function submitAssignmentResponse(subData) {
  if (FRAPPE_URL) {
    try {
      return await frappeRestPost("LMS Assignment Submission", {
        assignment: subData.assignment,
        assignment_title: subData.assignment_title,
        type: subData.type || 'Text',
        member: subData.member,
        member_name: subData.member_name,
        answer: subData.answer || '',
        course: subData.course,
        status: 'Not Graded',
        question: subData.question || ''
      });
    } catch (e) {
      console.error("Failed to upload assignment submission.", e);
    }
  }
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('assignment_submissions') || '[]';
    const list = JSON.parse(saved);
    const newSub = {
      ...subData,
      id: 'sub-ass-' + Date.now(),
      status: 'Not Graded',
      comments: '',
      evaluator: '',
      timestamp: new Date().toISOString()
    };
    list.unshift(newSub);
    localStorage.setItem('assignment_submissions', JSON.stringify(list));
    return newSub;
  }
  return subData;
}

export async function gradeAssignmentSubmission(id, gradeData) {
  if (gradeData.score !== undefined || gradeData.ai_evaluation) {
    setStoredAiEval(id, gradeData.score, gradeData.ai_evaluation);
  }
  if (FRAPPE_URL) {
    try {
      return await frappeRestPut("LMS Assignment Submission", id, {
        status: gradeData.status,
        comments: gradeData.comments,
        evaluator: gradeData.evaluator
      });
    } catch (e) {
      console.error("Failed to grade assignment submission.", e);
    }
  }
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('assignment_submissions') || '[]';
    const list = JSON.parse(saved);
    const updated = list.map(sub => sub.id === id ? { ...sub, ...gradeData } : sub);
    localStorage.setItem('assignment_submissions', JSON.stringify(updated));
    return gradeData;
  }
  return gradeData;
}

// --- Job Opportunity API ---

const DEFAULT_JOBS = [
  { id: '1', title: 'Senior Software Engineer', company: 'Google', location: 'Mountain View, CA', type: 'Full Time', work_mode: 'Hybrid', status: 'Open', company_website: 'https://google.com', description: '<p>We are looking for a Senior Software Engineer with strong background in distributed systems and systems design.</p>', date: 'Posted 2 days ago' },
  { id: '2', title: 'Frontend Developer (React)', company: 'Meta', location: 'Remote', type: 'Full Time', work_mode: 'Remote', status: 'Open', company_website: 'https://meta.com', description: '<p>Build the next generation of social applications using React, Next.js, and modern CSS.</p>', date: 'Posted 3 days ago' },
  { id: '3', title: 'Product Design Intern', company: 'Figma', location: 'San Francisco, CA', type: 'Part Time', work_mode: 'On-site', status: 'Open', company_website: 'https://figma.com', description: '<p>Join our design systems team to shape the tool that designers around the world use daily.</p>', date: 'Posted 5 days ago' },
  { id: '4', title: 'Full Stack Engineer', company: 'Vercel', location: 'Remote', type: 'Full Time', work_mode: 'Remote', status: 'Open', company_website: 'https://vercel.com', description: '<p>Work on Next.js and Vercel hosting platform features. Experience in Rust and Node.js is a plus.</p>', date: 'Posted 1 week ago' },
  { id: '5', title: 'Python Backend Specialist', company: 'OpenAI', location: 'San Francisco, CA', type: 'Full Time', work_mode: 'On-site', status: 'Closed', company_website: 'https://openai.com', description: '<p>Help train and run neural networks using high-performance Python APIs.</p>', date: 'Posted 1 week ago' },
];

export async function getJobs() {
  if (FRAPPE_URL) {
    try {
      const jobs = await frappeRestGet("Job Opportunity", {
        fields: JSON.stringify(["name", "job_title", "location", "type", "work_mode", "status", "company_name", "company_website", "description", "creation"]),
        limit_page_length: 100
      });
      return jobs.map(j => ({
        id: j.name,
        title: j.job_title,
        location: j.location,
        type: j.type || 'Full Time',
        work_mode: j.work_mode || 'Remote',
        status: j.status || 'Open',
        company: j.company_name,
        company_website: j.company_website || '',
        description: j.description || '',
        date: new Date(j.creation).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      }));
    } catch (e) {
      console.error("Failed to fetch jobs. Falling back.", e);
    }
  }

  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('admin_jobs_list');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    localStorage.setItem('admin_jobs_list', JSON.stringify(DEFAULT_JOBS));
    return DEFAULT_JOBS;
  }
  return DEFAULT_JOBS;
}

export async function createJob(jobData) {
  if (FRAPPE_URL) {
    try {
      const result = await frappeRestPost("Job Opportunity", {
        job_title: jobData.title,
        location: jobData.location,
        type: jobData.type || 'Full Time',
        work_mode: jobData.work_mode || 'Remote',
        status: jobData.status || 'Open',
        company_name: jobData.company,
        company_website: jobData.company_website,
        description: jobData.description || '',
        company_logo: '/placeholder-logo.png',
        company_email_address: 'careers@company.com'
      });
      return { ...jobData, id: result.name };
    } catch (e) {
      console.error("Failed to create job. Falling back.", e);
      throw e;
    }
  }

  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('admin_jobs_list') || JSON.stringify(DEFAULT_JOBS);
    const list = JSON.parse(saved);
    const newJob = { ...jobData, id: Date.now().toString(), date: 'Posted just now' };
    list.unshift(newJob);
    localStorage.setItem('admin_jobs_list', JSON.stringify(list));
    return newJob;
  }
  return jobData;
}

export async function updateJob(id, jobData) {
  if (FRAPPE_URL) {
    try {
      await frappeRestPut("Job Opportunity", id, {
        job_title: jobData.title,
        location: jobData.location,
        type: jobData.type,
        work_mode: jobData.work_mode,
        status: jobData.status,
        company_name: jobData.company,
        company_website: jobData.company_website,
        description: jobData.description,
        company_logo: '/placeholder-logo.png',
        company_email_address: 'careers@company.com'
      });
      return jobData;
    } catch (e) {
      console.error("Failed to update job. Falling back.", e);
      throw e;
    }
  }

  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('admin_jobs_list') || JSON.stringify(DEFAULT_JOBS);
    const list = JSON.parse(saved);
    const updated = list.map(j => j.id === id ? { ...j, ...jobData } : j);
    localStorage.setItem('admin_jobs_list', JSON.stringify(updated));
    return jobData;
  }
  return jobData;
}

export async function deleteJob(id) {
  if (FRAPPE_URL) {
    try {
      await frappeRestDelete("Job Opportunity", id);
      return true;
    } catch (e) {
      console.error("Failed to delete job.", e);
    }
  }

  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('admin_jobs_list') || JSON.stringify(DEFAULT_JOBS);
    const list = JSON.parse(saved);
    const filtered = list.filter(j => j.id !== id);
    localStorage.setItem('admin_jobs_list', JSON.stringify(filtered));
    return true;
  }
  return false;
}

// --- LMS Search API ---

export async function searchLMS(query) {
  const q = query.trim().toLowerCase();
  if (!q) return { courses: [], batches: [], quizzes: [], assignments: [], jobs: [] };

  if (FRAPPE_URL) {
    try {
      const [courses, batches, quizzes, assignments, jobs] = await Promise.all([
        frappeRestGet("LMS Course", {
          fields: JSON.stringify(["name", "title", "category", "published"]),
          filters: JSON.stringify([["title", "like", `%${query}%`]]),
          limit_page_length: 20
        }).catch(() => []),
        frappeRestGet("LMS Batch", {
          fields: JSON.stringify(["name", "title", "medium"]),
          filters: JSON.stringify([["title", "like", `%${query}%`]]),
          limit_page_length: 20
        }).catch(() => []),
        frappeRestGet("LMS Quiz", {
          fields: JSON.stringify(["name", "title", "course"]),
          filters: JSON.stringify([["title", "like", `%${query}%`]]),
          limit_page_length: 20
        }).catch(() => []),
        frappeRestGet("LMS Assignment", {
          fields: JSON.stringify(["name", "title", "course"]),
          filters: JSON.stringify([["title", "like", `%${query}%`]]),
          limit_page_length: 20
        }).catch(() => []),
        frappeRestGet("Job Opportunity", {
          fields: JSON.stringify(["name", "job_title", "company_name", "status"]),
          filters: JSON.stringify([["job_title", "like", `%${query}%`]]),
          limit_page_length: 20
        }).catch(() => [])
      ]);

      return {
        courses: (courses || []).map(c => ({ id: c.name, title: c.title, category: c.category, status: c.published ? "Published" : "Draft" })),
        batches: (batches || []).map(b => ({ id: b.name, title: b.title, medium: b.medium || "Online" })),
        quizzes: (quizzes || []).map(q => ({ id: q.name, title: q.title, course: q.course })),
        assignments: (assignments || []).map(a => ({ id: a.name, title: a.title, course: a.course })),
        jobs: (jobs || []).map(j => ({ id: j.name, title: j.job_title, company: j.company_name, status: j.status }))
      };
    } catch (e) {
      console.error("Failed to query search from Frappe REST API. Falling back to local storage.", e);
    }
  }

  // Local fallback
  if (typeof window !== 'undefined') {
    const getLocal = (key, def) => {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : def;
      } catch (e) { return def; }
    };

    const courses = getLocal('admin_courses_list', DEFAULT_COURSES);
    const batches = getLocal('admin_batches_list', DEFAULT_BATCHES);
    const quizzes = getLocal('admin_quizzes_list', DEFAULT_QUIZZES);
    const assignments = getLocal('admin_assignments_list', DEFAULT_ASSIGNMENTS);
    const jobs = getLocal('admin_jobs_list', DEFAULT_JOBS);

    const matches = (str) => (str || '').toLowerCase().includes(q);

    return {
      courses: courses.filter(c => matches(c.title) || matches(c.category)),
      batches: batches.filter(b => matches(b.title) || matches(b.medium)),
      quizzes: quizzes.filter(qz => matches(qz.title)),
      assignments: assignments.filter(a => matches(a.title)),
      jobs: jobs.filter(j => matches(j.title) || matches(j.company))
    };
  }

  return { courses: [], batches: [], quizzes: [], assignments: [], jobs: [] };
}

// --- LMS Notifications/Alerts API ---

const DEFAULT_NOTIFICATIONS = [
  { id: '1', title: 'New Student Enrollment', message: 'Aarav Mehta has enrolled in "Python Fundamentals".', category: 'Enrollment', read: false, date: '10 mins ago' },
  { id: '2', title: 'Assignment Submission', message: 'Sneha Patel submitted "Implementing Fibonacci Sequence Generator".', category: 'Assignment', read: false, date: '1 hour ago' },
  { id: '3', title: 'Quiz Completed', message: 'Rohan Sharma scored 90% in "Python Syntax & Variables Quiz".', category: 'Quiz', read: true, date: 'Yesterday' },
  { id: '4', title: 'System Alert', message: 'Database backup completed successfully.', category: 'System', read: true, date: '2 days ago' }
];

export async function getNotifications() {
  // LMS Alert is a mock DocType not present in standard Frappe LMS.
  // We fall back directly to avoid console 404 network errors.
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('admin_notifications_list');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    localStorage.setItem('admin_notifications_list', JSON.stringify(DEFAULT_NOTIFICATIONS));
    return DEFAULT_NOTIFICATIONS;
  }
  return DEFAULT_NOTIFICATIONS;
}

export async function markNotificationRead(id) {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('admin_notifications_list') || JSON.stringify(DEFAULT_NOTIFICATIONS);
    const list = JSON.parse(saved);
    const updated = list.map(n => n.id === id ? { ...n, read: true } : n);
    localStorage.setItem('admin_notifications_list', JSON.stringify(updated));
    return true;
  }
  return false;
}

export async function clearAllNotifications() {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('admin_notifications_list') || JSON.stringify(DEFAULT_NOTIFICATIONS);
    const list = JSON.parse(saved);
    const updated = list.map(n => ({ ...n, read: true }));
    localStorage.setItem('admin_notifications_list', JSON.stringify(updated));
    return true;
  }
  return false;
}

// --- LMS Certifications API ---

const DEFAULT_CERTIFICATES = [
  { id: 'cert-101', student_name: 'Aarav Mehta', course_title: 'Python Fundamentals', issue_date: 'Jun 10, 2026', cert_hash: 'py-8f3a9b2c1d', status: 'Active' },
  { id: 'cert-102', student_name: 'Sneha Patel', course_title: 'Data Structures & Algorithms', issue_date: 'Jun 12, 2026', cert_hash: 'dsa-4c7e6d2a8b', status: 'Active' }
];

const DEFAULT_CERT_CONFIG = {
  signer_name: 'Dr. Seshu Kumar',
  signer_title: 'LMS Academic Director',
  require_passing_quiz: true,
  require_assignments_submitted: true,
  theme_color: '#9B6EF8'
};

export async function getCertificates() {
  if (FRAPPE_URL) {
    try {
      const certs = await frappeRestGet("LMS Certificate", {
        fields: JSON.stringify(["name", "member_name", "course_title", "issue_date", "published"]),
        limit_page_length: 100
      });
      if (certs && Array.isArray(certs)) {
        return certs.map(c => ({
          id: c.name,
          student_name: c.member_name || "Unknown Student",
          course_title: c.course_title,
          issue_date: c.issue_date ? new Date(c.issue_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "",
          cert_hash: c.name,
          status: c.published ? "Active" : "Draft"
        }));
      }
    } catch (e) {
      console.error("Failed to fetch certificates from Frappe REST API. Falling back.", e);
    }
  }

  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('admin_certificates_list');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    localStorage.setItem('admin_certificates_list', JSON.stringify(DEFAULT_CERTIFICATES));
    return DEFAULT_CERTIFICATES;
  }
  return DEFAULT_CERTIFICATES;
}

export async function createCertificate(certData) {
  if (FRAPPE_URL) {
    try {
      const result = await frappeRestPost("LMS Certificate", {
        member: certData.member_email || "admin@lms.com",
        member_name: certData.student_name,
        course_title: certData.course_title,
        issue_date: certData.issue_date ? new Date(certData.issue_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        published: 1
      });
      return { ...certData, id: result.name, cert_hash: result.name, status: "Active" };
    } catch (e) {
      console.error("Failed to create certificate via Frappe REST API. Falling back.", e);
      throw e;
    }
  }

  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('admin_certificates_list') || JSON.stringify(DEFAULT_CERTIFICATES);
    const list = JSON.parse(saved);
    const newCert = {
      ...certData,
      id: 'cert-' + Date.now(),
      cert_hash: certData.cert_hash || Math.random().toString(36).substr(2, 10),
      issue_date: certData.issue_date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'Active'
    };
    list.unshift(newCert);
    localStorage.setItem('admin_certificates_list', JSON.stringify(list));
    return newCert;
  }
  return certData;
}

export async function deleteCertificate(id) {
  if (FRAPPE_URL) {
    try {
      await frappeRestDelete("LMS Certificate", id);
      return true;
    } catch (e) {
      console.error("Failed to delete certificate.", e);
    }
  }

  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('admin_certificates_list') || JSON.stringify(DEFAULT_CERTIFICATES);
    const list = JSON.parse(saved);
    const filtered = list.filter(c => c.id !== id);
    localStorage.setItem('admin_certificates_list', JSON.stringify(filtered));
    return true;
  }
  return false;
}

export async function getCertificateConfig() {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('admin_cert_config');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    localStorage.setItem('admin_cert_config', JSON.stringify(DEFAULT_CERT_CONFIG));
    return DEFAULT_CERT_CONFIG;
  }
  return DEFAULT_CERT_CONFIG;
}

export async function saveCertificateConfig(config) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('admin_cert_config', JSON.stringify(config));
    return config;
  }
  return config;
}

export async function saveProgressToRedis(email, completed) {
  try {
    const res = await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, completed })
    });
    return res.ok;
  } catch (e) {
    console.error("Failed to save progress to Redis:", e);
    return false;
  }
}

export async function getProgressFromRedis(email) {
  try {
    const res = await fetch(`/api/progress?email=${encodeURIComponent(email)}`);
    if (res.ok) {
      const data = await res.json();
      return data.completed || {};
    }
  } catch (e) {
    console.error("Failed to get progress from Redis:", e);
  }
  return null;
}

export async function getLMSStudents() {
  if (FRAPPE_URL) {
    try {
      const users = await frappeGet("lms.lms.api.get_lms_students_optimized");
      if (users && Array.isArray(users) && !users.error) {
        return users;
      }
    } catch (e) {
      console.warn("Failed to fetch optimized students, falling back to legacy User REST API.", e);
    }

    try {
      const users = await frappeRestGet("User", {
        fields: JSON.stringify(["name", "email", "full_name", "enabled"]),
        filters: JSON.stringify([
          ["name", "!=", "Administrator"],
          ["name", "!=", "Guest"],
          ["enabled", "=", 1]
        ]),
        limit_page_length: 500
      });
      return users.map(u => ({
        username: u.email || u.name,
        name: u.full_name || u.name
      }));
    } catch (e) {
      console.error("Failed to fetch students from Frappe REST API, falling back.", e);
    }
  }
  return [
    { username: 'student1@lms.com', name: 'Aarav Mehta' },
    { username: 'student2@lms.com', name: 'Sneha Patel' },
    { username: 'student3@lms.com', name: 'Rohan Sharma' },
    { username: 'student4@lms.com', name: 'Priya Nair' },
    { username: 'student5@lms.com', name: 'Aditya Rao' }
  ];
}