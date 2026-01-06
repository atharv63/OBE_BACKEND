

// const assignmentsAPI = {
//   // Get all faculties in department
//   getDepartmentFaculties: () => api.get("/assignments/faculties"),

//   // Get available faculties for a course
//   getAvailableFacultiesForCourse: (courseId, semester, year) => 
//     api.get(`/assignments/courses/${courseId}/available-faculties`, {
//       params: { semester, year }
//     }),

//   // Get course assignments
//   getCourseAssignments: (courseId, semester, year) => 
//     api.get(`/assignments/courses/${courseId}/assignments`, {
//       params: { semester, year }
//     }),

//   // Assign faculty to course
//   assignFacultyToCourse: (courseId, data) => 
//     api.post(`/assignments/courses/${courseId}/assign`, data),

//   // Update assignment
//   updateAssignment: (courseId, facultyId, semester, year, data) =>
//     api.put(`/assignments/courses/${courseId}/assignments/${facultyId}/${semester}/${year}`, data),

//   // Remove assignment
//   removeAssignment: (courseId, facultyId, semester, year) =>
//     api.delete(`/assignments/courses/${courseId}/assignments/${facultyId}/${semester}/${year}`),

//   // Get faculty workload
//   getFacultyWorkload: (facultyId, year) =>
//     api.get(`/assignments/faculties/${facultyId}/workload`, {
//       params: { year }
//     }),
// };

// export default assignmentsAPI;
