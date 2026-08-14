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

// Helper to invalidate cache
export function invalidateCoursesCache() {
  const userId = getActiveUserId();
  delete clientCache.courses[userId];
  delete clientCache.coursesTimestamp[userId];
  if (typeof window !== 'undefined') {
    localStorage.removeItem(`cached_courses_list_${userId}`);
    localStorage.removeItem(`cached_courses_timestamp_${userId}`);
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
      // Clear all cached syllabuses from localStorage
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
      headers: { "Content-Type": "application/json" },
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
    headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
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
    headers: { "Content-Type": "application/json" },
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
    headers: { "Content-Type": "application/json" },
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

// --- High-level Unified REST-based Course Management API ---

/**
 * Fetch all courses (filtered or unfiltered)
 */
export async function getCourses(options = {}) {
  const forceRefresh = options.forceRefresh || (typeof window !== 'undefined' && window.location.pathname.includes('/admin'));
  const userId = getActiveUserId();

  let locallyDeleted = [];
  if (typeof window !== 'undefined') {
    try {
      locallyDeleted = JSON.parse(localStorage.getItem('locally_deleted_courses') || '[]');
    } catch (e) {}
  }

  // Check cache first
  const now = Date.now();
  if (typeof window !== 'undefined' && !forceRefresh) {
    if (!clientCache.courses[userId]) {
      try {
        const cachedStr = localStorage.getItem(`cached_courses_list_${userId}`);
        const cachedTs = Number(localStorage.getItem(`cached_courses_timestamp_${userId}`) || '0');
        if (cachedStr && cachedTs) {
          clientCache.courses[userId] = JSON.parse(cachedStr);
          clientCache.coursesTimestamp[userId] = cachedTs;
        }
      } catch (e) {}
    }
  }

  // If cache is valid (within 5 minutes / 300,000ms) and we are not forcing refresh, return it instantly
  if (!forceRefresh && clientCache.courses[userId] && (now - clientCache.coursesTimestamp[userId] < 300000)) {
    return clientCache.courses[userId].filter(c => !locallyDeleted.includes(c.id));
  }

  const fetchPromise = (async () => {
    let list = null;
    if (FRAPPE_URL) {
      try {
        list = await frappeGet("lms.lms.api.get_courses_optimized");
        if (list && Array.isArray(list) && !list.error) {
          // Success
        } else {
          list = null;
        }
      } catch (e) {
        console.warn("Failed to fetch optimized courses, falling back to legacy REST API.", e);
      }

      if (!list) {
        try {
          // Fetch LMS Courses and Enrollments from Frappe in parallel
          const [courses, enrollments] = await Promise.all([
            frappeRestGet("LMS Course", {
              fields: JSON.stringify(["name", "title", "published", "creation", "category", "short_introduction", "lessons", "description", "image"]),
              limit_page_length: 100
            }),
            frappeRestGet("LMS Enrollment", {
              fields: JSON.stringify(["course", "member"]),
              limit_page_length: 1000
            }).catch(() => [])
          ]);

          const enrollmentCounts = {};
          if (enrollments && Array.isArray(enrollments)) {
            enrollments.forEach(e => {
              if (e.course) {
                enrollmentCounts[e.course] = (enrollmentCounts[e.course] || 0) + 1;
              }
            });
          }

          if (courses && Array.isArray(courses)) {
            list = courses.map(c => {
              let descText = c.description || "";
              let pdfLink = "";
              if (descText.trim().startsWith('{')) {
                try {
                  const parsed = JSON.parse(descText);
                  descText = parsed.description || "";
                  pdfLink = parsed.pdf || "";
                } catch(e) {}
              }
              return {
                id: c.name,
                title: c.title,
                instructor: "Administrator",
                category: c.category || "Web Development",
                tagline: c.short_introduction || "Learn the basics and get started.",
                lessonsCount: c.lessons || 0,
                enrolled: enrollmentCounts[c.name] || 0,
                status: c.published ? "Published" : "Draft",
                date: new Date(c.creation).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                description: descText,
                image: c.image || "",
                pdf: pdfLink
              };
            });
          }
        } catch (e) {
          console.error("Failed to fetch courses from Frappe REST API. Falling back to local state.", e);
        }
      }
    }

    // Fallback to LocalStorage for offline/simulated mode
    if (!list && typeof window !== 'undefined') {
      const savedEnrollments = localStorage.getItem('student_course_enrollments');
      let localEnrollments = [];
      if (!savedEnrollments) {
        const defaultEnrollments = [
          { course: '1', member: 'student1@lms.com' },
          { course: '2', member: 'student1@lms.com' },
          { course: '1', member: 'student2@lms.com' },
          { course: '1', member: 'student3@lms.com' },
          { course: '2', member: 'student3@lms.com' },
          { course: '3', member: 'student3@lms.com' },
          { course: '2', member: 'student4@lms.com' },
          { course: '1', member: 'student5@lms.com' }
        ];
        localStorage.setItem('student_course_enrollments', JSON.stringify(defaultEnrollments));
        localEnrollments = defaultEnrollments;
      } else {
        try {
          localEnrollments = JSON.parse(savedEnrollments);
        } catch (e) {}
      }

      const localCounts = {};
      localEnrollments.forEach(e => {
        if (e.course) {
          localCounts[e.course] = (localCounts[e.course] || 0) + 1;
        }
      });

      const saved = localStorage.getItem('admin_courses_list');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          list = parsed.map(c => ({
            ...c,
            enrolled: localCounts[c.id] || 0
          }));
        } catch (e) {}
      }
      if (!list) {
        list = DEFAULT_COURSES.map(c => ({
          ...c,
          enrolled: localCounts[c.id] || 0
        }));
        localStorage.setItem('admin_courses_list', JSON.stringify(list));
      }
    }

    if (!list) {
      list = DEFAULT_COURSES;
    }

    // Clean up locallyDeleted cache for any courses that actually exist in the backend
    if (typeof window !== 'undefined' && locallyDeleted.length > 0) {
      const activeIds = new Set(list.map(c => c.id));
      const cleaned = locallyDeleted.filter(id => !activeIds.has(id));
      if (cleaned.length !== locallyDeleted.length) {
        localStorage.setItem('locally_deleted_courses', JSON.stringify(cleaned));
      }
    }

    // Update Cache
    clientCache.courses[userId] = list;
    clientCache.coursesTimestamp[userId] = Date.now();
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`cached_courses_list_${userId}`, JSON.stringify(list));
        localStorage.setItem(`cached_courses_timestamp_${userId}`, String(clientCache.coursesTimestamp[userId]));
      } catch (e) {}
    }

    return list.filter(c => !locallyDeleted.includes(c.id));
  })();

  if (!forceRefresh && clientCache.courses[userId]) {
    // Run background refresh silently
    fetchPromise.catch(e => console.warn("Background courses refresh failed:", e));
    return clientCache.courses[userId].filter(c => !locallyDeleted.includes(c.id));
  }

  return fetchPromise;
}

/**
 * Create a new course
 */
export async function createCourse(courseData) {
  invalidateCoursesCache();
  if (FRAPPE_URL) {
    try {
      let inst = "Administrator";
      if (courseData.instructor && (courseData.instructor.includes("@") || courseData.instructor === "Administrator")) {
        inst = courseData.instructor;
      }
      const serializedDescription = JSON.stringify({
        description: courseData.description || "",
        pdf: courseData.pdf || ""
      });
      const result = await frappeRestPost("LMS Course", {
        title: sanitizeTitle(courseData.title),
        published: courseData.status === "Published" ? 1 : 0,
        instructors: [{ instructor: inst }],
        short_introduction: courseData.tagline || courseData.short_introduction || `${courseData.title} course introduction.`,
        description: serializedDescription,
        category: courseData.category || "Web Development",
        image: courseData.image || ""
      });
      if (result && result.name) {
        return {
          id: result.name,
          title: result.title,
          instructor: inst,
          category: result.category || "Web Development",
          enrolled: 0,
          status: result.published ? "Published" : "Draft",
          date: new Date(result.creation).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          description: courseData.description || "",
          image: result.image || "",
          pdf: courseData.pdf || ""
        };
      }
    } catch (e) {
      console.error("Failed to create course via Frappe REST API. Falling back to local state.", e);
    }
  }

  // Simulated Fallback
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('admin_courses_list') || JSON.stringify(DEFAULT_COURSES);
    const courses = JSON.parse(saved);
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const newCourse = {
      ...courseData,
      id: Date.now().toString(),
      enrolled: 0,
      date: formattedDate
    };
    courses.unshift(newCourse);
    localStorage.setItem('admin_courses_list', JSON.stringify(courses));
    return newCourse;
  }
  return courseData;
}

/**
 * Update a course
 */
export async function updateCourse(id, courseData) {
  invalidateCoursesCache();
  if (id) invalidateSyllabusCache(id);
  if (FRAPPE_URL) {
    try {
      let inst = "Administrator";
      if (courseData.instructor && (courseData.instructor.includes("@") || courseData.instructor === "Administrator")) {
        inst = courseData.instructor;
      }
      const serializedDescription = JSON.stringify({
        description: courseData.description || "",
        pdf: courseData.pdf || ""
      });
      const result = await frappeRestPut("LMS Course", id, {
        title: sanitizeTitle(courseData.title),
        published: courseData.status === "Published" ? 1 : 0,
        category: courseData.category || undefined,
        instructors: [{ instructor: inst }],
        short_introduction: courseData.tagline || courseData.short_introduction || undefined,
        description: serializedDescription,
        image: courseData.image || ""
      });
      if (result && result.name) {
        return {
          id: result.name,
          title: result.title,
          instructor: inst,
          category: result.category || "Web Development",
          enrolled: courseData.enrolled || 0,
          status: result.published ? "Published" : "Draft",
          date: courseData.date,
          description: courseData.description || "",
          image: result.image || "",
          pdf: courseData.pdf || ""
        };
      }
    } catch (e) {
      console.error("Failed to update course via Frappe REST API. Falling back to local state.", e);
    }
  }

  // Simulated Fallback
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('admin_courses_list') || JSON.stringify(DEFAULT_COURSES);
    const courses = JSON.parse(saved);
    const updated = courses.map(c => c.id === id ? { ...c, ...courseData } : c);
    localStorage.setItem('admin_courses_list', JSON.stringify(updated));
    return courseData;
  }
  return courseData;
}

/**
 * Delete a course
 */
export async function deleteCourse(id) {
  invalidateCoursesCache();
  if (id) invalidateSyllabusCache(id);

  // Save to locally deleted list to ensure it's hidden from the UI immediately
  if (typeof window !== 'undefined') {
    try {
      const deleted = JSON.parse(localStorage.getItem('locally_deleted_courses') || '[]');
      if (!deleted.includes(id)) {
        deleted.push(id);
        localStorage.setItem('locally_deleted_courses', JSON.stringify(deleted));
      }
    } catch (e) {}
  }

  if (FRAPPE_URL) {
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
        // Step A: Unlink lessons from chapters by clearing lessons child table in each chapter
        for (const mod of syllabus.modules) {
          await frappeRestPut("Course Chapter", mod.id, { lessons: [] }).catch(err => {
            console.warn(`Failed to unlink lessons from chapter ${mod.id}:`, err);
          });
        }

        // Step B: Unlink chapters from course by clearing chapters child table in the course
        await frappeRestPut("LMS Course", id, { chapters: [] }).catch(err => {
          console.warn(`Failed to unlink chapters from course ${id}:`, err);
        });

        // Step C: Delete all Course Lessons now that they are unlinked from chapters
        for (const mod of syllabus.modules) {
          if (mod.lessons) {
            for (const les of mod.lessons) {
              await frappeRestDelete("Course Lesson", les.id).catch(err => {
                console.warn(`Could not delete Course Lesson ${les.id}:`, err);
              });
            }
          }
        }

        // Step D: Delete all Course Chapters now that they are unlinked and lessons are deleted
        for (const mod of syllabus.modules) {
          await frappeRestDelete("Course Chapter", mod.id).catch(err => {
            console.warn(`Could not delete Course Chapter ${mod.id}:`, err);
          });
        }
      }

      // Step E: Finally delete the LMS Course document itself
      await frappeRestDelete("LMS Course", id);
    } catch (e) {
      console.error("Failed to delete course via Frappe REST API.", e);
      throw e;
    }
  }

  // Simulated Fallback / Offline Fallback sync
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('admin_courses_list') || JSON.stringify(DEFAULT_COURSES);
    try {
      const courses = JSON.parse(saved);
      const filtered = courses.filter(c => c.id !== id);
      localStorage.setItem('admin_courses_list', JSON.stringify(filtered));
    } catch (e) {}
    return true;
  }
  return false;
}

/**
 * Fetch course syllabus outline (Chapters & Lessons) from Frappe DocTypes or Local Caches
 */
export async function getCourseSyllabus(courseId, options = {}) {
  const forceRefresh = options.forceRefresh || (typeof window !== 'undefined' && window.location.pathname.includes('/admin'));
  const now = Date.now();

  // Check cache first
  if (!forceRefresh) {
    if (typeof window !== 'undefined') {
      if (!clientCache.syllabus[courseId]) {
        try {
          const cachedStr = localStorage.getItem(`cached_syllabus_${courseId}`);
          const cachedTs = Number(localStorage.getItem(`cached_syllabus_timestamp_${courseId}`) || '0');
          if (cachedStr && cachedTs) {
            clientCache.syllabus[courseId] = {
              data: JSON.parse(cachedStr),
              timestamp: cachedTs
            };
          }
        } catch (e) {}
      }
    }

    const cachedEntry = clientCache.syllabus[courseId];
    if (cachedEntry && (now - cachedEntry.timestamp < 300000)) { // 5 minutes TTL
      return cachedEntry.data;
    }
  }

  let syllabus = null;
  if (FRAPPE_URL) {
    try {
      syllabus = await frappeGet("lms.lms.api.get_course_syllabus_optimized", { course_id: courseId });
      if (syllabus && !syllabus.error) {
        // Success
      } else {
        syllabus = null;
      }
    } catch (e) {
      console.warn("Failed to fetch optimized syllabus, falling back to legacy REST API.", e);
    }

    if (!syllabus) {
      try {
        // 1. Fetch the main Course document to read its chapters child table
        const courseDoc = await frappeRestGet(`LMS Course/${courseId}`);
        const chapterRefs = courseDoc.chapters || [];

        // 2. Fetch all Course Chapters in parallel
        const modules = await Promise.all((chapterRefs || []).map(async (ref) => {
          try {
            const chDoc = await frappeRestGet(`Course Chapter/${ref.chapter}`);
            const lessonRefs = chDoc.lessons || [];

            // Return lesson skeletons instead of making parallel REST calls to prevent database locks.
            // These skeletons are lazy-loaded when the student is on the active lesson page.
            const lessons = (lessonRefs || []).map((lRef) => {
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
                overview: "Lesson details are loading...",
                pts: [],
                quizQuestions: [],
                codingExercise: { hasExercise: false },
                pdf: "",
                lazyLoad: true
              };
            });

            return {
              id: chDoc.name,
              title: chDoc.title,
              emoji: "📖",
              accent: "#5B8CF8",
              lessons
            };
          } catch (err) {
            console.error(`Failed to fetch chapter details for ${ref.chapter}`, err);
            return { id: ref.chapter, title: "Untitled Chapter", emoji: "📖", accent: "#5B8CF8", lessons: [] };
          }
        }));

        syllabus = {
          id: courseId,
          title: courseDoc.title,
          tagline: courseDoc.short_introduction || "",
          modules
        };
      } catch (e) {
        console.error("Failed to fetch syllabus from Frappe. Falling back to local state.", e);
      }
    }
  }

  // Caching fallback
  if (!syllabus && typeof window !== 'undefined') {
    const saved = localStorage.getItem(`admin_course_details_${courseId}`);
    if (saved) {
      try {
        syllabus = JSON.parse(saved);
      } catch (e) {}
    }

    if (!syllabus) {
      // Default structure for newly created courses
      const defaultOutline = {
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
                vid: "rfscVS0vtbw",
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
                }
              }
            ]
          }
        ]
      };
      localStorage.setItem(`admin_course_details_${courseId}`, JSON.stringify(defaultOutline));
      syllabus = defaultOutline;
    }
  }

  if (!syllabus) {
    syllabus = { id: courseId, modules: [] };
  }

  // Save to Cache
  clientCache.syllabus[courseId] = {
    data: syllabus,
    timestamp: Date.now()
  };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`cached_syllabus_${courseId}`, JSON.stringify(syllabus));
      localStorage.setItem(`cached_syllabus_timestamp_${courseId}`, String(clientCache.syllabus[courseId].timestamp));
    } catch (e) {}
  }

  return syllabus;
}

/**
 * Save course syllabus outline to Frappe DocTypes or Local Storage
 */
export async function saveCourseSyllabus(courseId, syllabus) {
  if (FRAPPE_URL) {
    try {
      // Get the existing database syllabus first to identify deletions
      const oldSyllabus = await getCourseSyllabus(courseId, { forceRefresh: true }).catch(() => null);
      const oldChapters = new Set();
      const oldLessons = new Set();
      if (oldSyllabus && oldSyllabus.modules) {
        oldSyllabus.modules.forEach(m => {
          oldChapters.add(m.id);
          if (m.lessons) {
            m.lessons.forEach(l => oldLessons.add(l.id));
          }
        });
      }

      const newChapters = new Set();
      const newLessons = new Set();
      syllabus.modules.forEach(m => {
        if (!m.id.startsWith("ch_")) {
          newChapters.add(m.id);
        }
        if (m.lessons) {
          m.lessons.forEach(l => {
            if (!l.id.startsWith("les_")) {
              newLessons.add(l.id);
            }
          });
        }
      });

      const chaptersList = [];

      // 1. Iterate over chapters and save them
      for (const chapter of syllabus.modules) {
        let chapterId = chapter.id;

        if (chapter.id.startsWith("ch_")) {
          const chDoc = await frappeRestPost("Course Chapter", {
            title: sanitizeTitle(chapter.title),
            course: courseId
          });
          chapterId = chDoc.name;
        } else {
          await frappeRestPut("Course Chapter", chapter.id, {
            title: sanitizeTitle(chapter.title)
          });
        }
        chaptersList.push(chapterId);

        // 2. Iterate over lessons in the chapter and save them
        const lessonsList = [];
        for (const lesson of chapter.lessons) {
          let lessonId = lesson.id;
          
          // Serialize pts, quizQuestions, and codingExercise to instructor_notes to persist in DB
          const notesStr = JSON.stringify({
            pts: lesson.pts || ["Key concept introduction."],
            quizQuestions: lesson.quizQuestions || [],
            codingExercise: lesson.codingExercise || {
              hasExercise: false,
              language: 'python',
              instruction: '',
              starterCode: '',
              solutionCode: '',
              testCases: []
            },
            pdf: lesson.pdf || ""
          });

          if (lesson.id.startsWith("les_")) {
            const lDoc = await frappeRestPost("Course Lesson", {
              title: sanitizeTitle(lesson.title),
              chapter: chapterId,
              course: courseId,
              youtube: lesson.vid,
              body: lesson.overview,
              instructor_notes: notesStr
            });
            lessonId = lDoc.name;
          } else {
            await frappeRestPut("Course Lesson", lesson.id, {
              title: sanitizeTitle(lesson.title),
              youtube: lesson.vid,
              body: lesson.overview,
              instructor_notes: notesStr
            });
          }
          lessonsList.push(lessonId);
        }

        // 3. Update the lessons child table in this chapter
        await frappeRestPut("Course Chapter", chapterId, {
          lessons: lessonsList.map(lId => ({ lesson: lId }))
        });
      }

      // 4. Update the chapters child table in the course document
      await frappeRestPut("LMS Course", courseId, {
        chapters: chaptersList.map(chId => ({ chapter: chId }))
      });

      // 5. Delete removed lessons (now safely unlinked from chapter child tables)
      for (const oldLesId of oldLessons) {
        if (!newLessons.has(oldLesId)) {
          await frappeRestDelete("Course Lesson", oldLesId).catch(err => {
            console.warn(`Failed to delete orphaned lesson ${oldLesId} on save:`, err);
          });
        }
      }

      // 6. Delete removed chapters (now safely unlinked from course child tables)
      for (const oldChId of oldChapters) {
        if (!newChapters.has(oldChId)) {
          await frappeRestDelete("Course Chapter", oldChId).catch(err => {
            console.warn(`Failed to delete orphaned chapter ${oldChId} on save:`, err);
          });
        }
      }

      invalidateCoursesCache();
      invalidateSyllabusCache(courseId);
      return getCourseSyllabus(courseId, { forceRefresh: true });
    } catch (e) {
      console.error("Failed to sync course syllabus outline with Frappe REST server.", e);
    }
  }

  // Caching fallback
  if (typeof window !== 'undefined') {
    localStorage.setItem(`admin_course_details_${courseId}`, JSON.stringify(syllabus));
    invalidateCoursesCache();
    invalidateSyllabusCache(courseId);
    return syllabus;
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
      console.error("Failed to create batch via Frappe REST API. Falling back to local state.", e);
      throw e;
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
      console.error("Failed to update batch via Frappe REST API. Falling back to local state.", e);
      throw e;
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
      console.error("Failed to fetch student enrollments via Frappe REST API. Falling back to local state.", e);
    }
  }

  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('student_course_enrollments') || '[]';
    let enrollments = [];
    try {
      enrollments = JSON.parse(saved);
    } catch (e) {}

    return enrollments.filter(e => e.member === studentEmail).map(e => e.course);
  }
  return [];
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
              console.error("Failed to fetch LMS Question detail:", ref.question, err);
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
          console.error("Failed to fetch LMS Quiz details:", q.name, err);
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
      return detailedQuizzes;
    } catch (e) {
      console.error("Failed to fetch quizzes. Falling back.", e);
    }
  }

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
  if (FRAPPE_URL) {
    try {
      // 1. Create each question as an LMS Question document first
      const questionsRefs = [];
      const qs = quizData.questions || [];
      for (const q of qs) {
        const qDoc = await frappeRestPost("LMS Question", {
          question: q.question,
          type: "Choices",
          multiple: 0,
          option_1: q.options[0] || "",
          is_correct_1: q.correct === 0 ? 1 : 0,
          option_2: q.options[1] || "",
          is_correct_2: q.correct === 1 ? 1 : 0,
          option_3: q.options[2] || "",
          is_correct_3: q.correct === 2 ? 1 : 0,
          option_4: q.options[3] || "",
          is_correct_4: q.correct === 3 ? 1 : 0,
        });
        questionsRefs.push({
          question: qDoc.name,
          marks: 5,
          question_detail: q.question,
          type: "Choices"
        });
      }

      // 2. Create the LMS Quiz document referencing these questions
      const payload = {
        title: quizData.title,
        course: quizData.course,
        lesson: quizData.lesson || undefined,
        max_attempts: parseInt(quizData.max_attempts) || 3,
        passing_percentage: parseInt(quizData.passing_percentage) || 70,
        total_marks: parseInt(quizData.total_marks) || 10,
        duration: quizData.duration || '10 mins',
        questions: questionsRefs
      };

      let result;
      try {
        result = await frappeRestPost("LMS Quiz", payload);
      } catch (err) {
        if (err.message && err.message.includes("Could not find Lesson")) {
          delete payload.lesson;
          result = await frappeRestPost("LMS Quiz", payload);
        } else {
          throw err;
        }
      }
      return { ...quizData, id: result.name };
    } catch (e) {
      console.error("Failed to create quiz via Frappe REST API. Falling back to local state.", e);
      throw e;
    }
  }

  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('admin_quizzes_list') || JSON.stringify(DEFAULT_QUIZZES);
    const list = JSON.parse(saved);
    const newQuiz = { ...quizData, id: 'quiz-' + Date.now() };
    list.unshift(newQuiz);
    localStorage.setItem('admin_quizzes_list', JSON.stringify(list));
    return newQuiz;
  }
  return quizData;
}

export async function updateQuiz(id, quizData) {
  if (FRAPPE_URL) {
    try {
      // 1. Create or update each question
      const questionsRefs = [];
      const qs = quizData.questions || [];
      for (const q of qs) {
        let qName = q.id;
        const qPayload = {
          question: q.question,
          type: "Choices",
          multiple: 0,
          option_1: q.options[0] || "",
          is_correct_1: q.correct === 0 ? 1 : 0,
          option_2: q.options[1] || "",
          is_correct_2: q.correct === 1 ? 1 : 0,
          option_3: q.options[2] || "",
          is_correct_3: q.correct === 2 ? 1 : 0,
          option_4: q.options[3] || "",
          is_correct_4: q.correct === 3 ? 1 : 0,
        };

        try {
          if (qName && !qName.startsWith("q_") && !qName.startsWith("quiz-")) {
            // Update existing Question document
            await frappeRestPut("LMS Question", qName, qPayload);
          } else {
            // Create new Question document
            const qDoc = await frappeRestPost("LMS Question", qPayload);
            qName = qDoc.name;
          }
        } catch (qErr) {
          const isNotFound = qErr.message && (
            qErr.message.includes('not found') || 
            qErr.message.includes('404') || 
            qErr.message.includes('DoesNotExistError')
          );
          if (isNotFound) {
            const qDoc = await frappeRestPost("LMS Question", qPayload);
            qName = qDoc.name;
          } else {
            throw qErr;
          }
        }

        questionsRefs.push({
          question: qName,
          marks: 5,
          question_detail: q.question,
          type: "Choices"
        });
      }

      // 2. Update LMS Quiz referencing these questions
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
        try {
          await frappeRestPut("LMS Quiz", id, updatePayload);
        } catch (err) {
          if (err.message && err.message.includes("Could not find Lesson")) {
            updatePayload.lesson = null;
            await frappeRestPut("LMS Quiz", id, updatePayload);
          } else {
            throw err;
          }
        }
        return quizData;
      } catch (qzErr) {
        const isNotFound = qzErr.message && (
          qzErr.message.includes('not found') || 
          qzErr.message.includes('404') || 
          qzErr.message.includes('DoesNotExistError')
        );
        if (isNotFound) {
          const createPayload = {
            title: quizData.title,
            course: quizData.course,
            lesson: quizData.lesson || undefined,
            max_attempts: parseInt(quizData.max_attempts) || 3,
            passing_percentage: parseInt(quizData.passing_percentage) || 70,
            total_marks: parseInt(quizData.total_marks) || 10,
            duration: quizData.duration || '10 mins',
            questions: questionsRefs
          };
          
          let result;
          try {
            result = await frappeRestPost("LMS Quiz", createPayload);
          } catch (err) {
            if (err.message && err.message.includes("Could not find Lesson")) {
              delete createPayload.lesson;
              result = await frappeRestPost("LMS Quiz", createPayload);
            } else {
              throw err;
            }
          }
          return { ...quizData, id: result.name };
        } else {
          throw qzErr;
        }
      }
    } catch (e) {
      console.error("Failed to update quiz via Frappe REST API. Falling back to local state.", e);
      throw e;
    }
  }

  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('admin_quizzes_list') || JSON.stringify(DEFAULT_QUIZZES);
    const list = JSON.parse(saved);
    const updated = list.map(q => q.id === id ? { ...q, ...quizData } : q);
    localStorage.setItem('admin_quizzes_list', JSON.stringify(updated));
    return quizData;
  }
  return quizData;
}

export async function deleteQuiz(id) {
  let backendDeleted = false;
  if (FRAPPE_URL) {
    try {
      await frappeRestDelete("LMS Quiz", id);
      backendDeleted = true;
    } catch (e) {
      console.error("Failed to delete quiz from Frappe server. It might be local-only or unauthorized.", e);
    }
  }

  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('admin_quizzes_list') || JSON.stringify(DEFAULT_QUIZZES);
    const list = JSON.parse(saved);
    const filtered = list.filter(q => q.id !== id);
    localStorage.setItem('admin_quizzes_list', JSON.stringify(filtered));
    return true;
  }
  return backendDeleted;
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

const DEFAULT_ASSIGNMENTS = [
  {
    id: 'assign-python-loops',
    title: 'Implementing Fibonacci Sequence Generator',
    course: '1',
    type: 'Text',
    question: '<p>Write a Python function <code>fibonacci(n)</code> that returns the first <code>n</code> Fibonacci numbers as a list. Hand in the source code file or code text.</p>',
    show_answer: true,
    answer: '<code>def fibonacci(n):\n    if n <= 0: return []\n    if n == 1: return [0]\n    seq = [0, 1]\n    while len(seq) < n:\n        seq.append(seq[-1] + seq[-2])\n    return seq</code>'
  },
  {
    id: 'assign-dsa-sorting',
    title: 'Custom Merge Sort Analysis',
    course: '2',
    type: 'PDF',
    question: '<p>Compare the computational complexity and space requirements of Merge Sort and In-place Quicksort. Submit a PDF report explaining edge cases.</p>',
    show_answer: false,
    answer: ''
  }
];

export async function getAssignments() {
  if (FRAPPE_URL) {
    try {
      const assignments = await frappeRestGet("LMS Assignment", {
        fields: JSON.stringify(["name", "title", "type", "course", "question", "show_answer", "answer"]),
        limit_page_length: 100
      });
      return assignments.map(a => ({
        id: a.name,
        title: a.title,
        type: a.type || 'Text',
        course: a.course,
        question: a.question || '',
        show_answer: !!a.show_answer,
        answer: a.answer || ''
      }));
    } catch (e) {
      console.error("Failed to fetch assignments. Falling back.", e);
    }
  }

  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('admin_assignments_list');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    localStorage.setItem('admin_assignments_list', JSON.stringify(DEFAULT_ASSIGNMENTS));
    return DEFAULT_ASSIGNMENTS;
  }
  return DEFAULT_ASSIGNMENTS;
}

export async function createAssignment(assignmentData) {
  if (FRAPPE_URL) {
    try {
      const result = await frappeRestPost("LMS Assignment", {
        title: assignmentData.title,
        type: assignmentData.type || 'Text',
        course: assignmentData.course,
        question: assignmentData.question || 'Assignment prompt details.',
        show_answer: assignmentData.show_answer ? 1 : 0,
        answer: assignmentData.answer || ''
      });
      return { ...assignmentData, id: result.name };
    } catch (e) {
      console.error("Failed to create assignment. Falling back.", e);
      throw e;
    }
  }

  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('admin_assignments_list') || JSON.stringify(DEFAULT_ASSIGNMENTS);
    const list = JSON.parse(saved);
    const newAss = { ...assignmentData, id: 'assign-' + Date.now() };
    list.unshift(newAss);
    localStorage.setItem('admin_assignments_list', JSON.stringify(list));
    return newAss;
  }
  return assignmentData;
}

export async function updateAssignment(id, assignmentData) {
  if (FRAPPE_URL) {
    try {
      await frappeRestPut("LMS Assignment", id, {
        title: assignmentData.title,
        type: assignmentData.type,
        course: assignmentData.course,
        question: assignmentData.question || 'Assignment prompt details.',
        show_answer: assignmentData.show_answer ? 1 : 0,
        answer: assignmentData.answer
      });
      return assignmentData;
    } catch (e) {
      console.error("Failed to update assignment. Falling back.", e);
      throw e;
    }
  }

  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('admin_assignments_list') || JSON.stringify(DEFAULT_ASSIGNMENTS);
    const list = JSON.parse(saved);
    const updated = list.map(a => a.id === id ? { ...a, ...assignmentData } : a);
    localStorage.setItem('admin_assignments_list', JSON.stringify(updated));
    return assignmentData;
  }
  return assignmentData;
}

export async function deleteAssignment(id) {
  if (FRAPPE_URL) {
    try {
      await frappeRestDelete("LMS Assignment", id);
      return true;
    } catch (e) {
      console.error("Failed to delete assignment.", e);
    }
  }

  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('admin_assignments_list') || JSON.stringify(DEFAULT_ASSIGNMENTS);
    const list = JSON.parse(saved);
    const filtered = list.filter(a => a.id !== id);
    localStorage.setItem('admin_assignments_list', JSON.stringify(filtered));
    return true;
  }
  return false;
}

// --- LMS Assignment Submission API ---

export async function getAssignmentSubmissions() {
  if (FRAPPE_URL) {
    try {
      const res = await frappeRestGet("LMS Assignment Submission", {
        fields: JSON.stringify(["name", "assignment", "assignment_title", "type", "member", "member_name", "evaluator", "assignment_attachment", "answer", "status", "question", "comments", "course", "lesson"]),
        limit_page_length: 100
      });
      return (res || []).map(s => ({
        id: s.name,
        ...s
      }));
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