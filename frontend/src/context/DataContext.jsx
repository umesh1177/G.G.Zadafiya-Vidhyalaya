import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { initialPrincipalData } from '../data/principalData';
import { initialFacultyData } from '../data/facultyData';
import { initialAssistantData } from '../data/assistantData';
import { initialStudentData } from '../data/studentData';

const STORAGE_KEY = 'sms_data_ctx_v1';
const DataContext = createContext(null);

function getDefaultState() {
  return {
    principal: initialPrincipalData,
    faculty: initialFacultyData,
    assistant: initialAssistantData,
    student: initialStudentData,
  };
}

function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultState();
    const parsed = JSON.parse(raw);
    return {
      principal: { ...initialPrincipalData, ...(parsed.principal || {}) },
      faculty: { ...initialFacultyData, ...(parsed.faculty || {}) },
      assistant: { ...initialAssistantData, ...(parsed.assistant || {}) },
      student: { ...initialStudentData, ...(parsed.student || {}) },
    };
  } catch {
    return getDefaultState();
  }
}

export function DataProvider({ children }) {
  const [state, setState] = useState(loadPersistedState);

  const commitState = useCallback((updater) => {
    setState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage quota errors cleanly
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setState({
            principal: { ...initialPrincipalData, ...(parsed.principal || {}) },
            faculty: { ...initialFacultyData, ...(parsed.faculty || {}) },
            assistant: { ...initialAssistantData, ...(parsed.assistant || {}) },
            student: { ...initialStudentData, ...(parsed.student || {}) },
          });
        } catch {
          // ignore invalid JSON
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const addStudent = (newStudent) => {
    commitState((prev) => ({
      ...prev,
      principal: {
        ...prev.principal,
        students: [newStudent, ...(prev.principal.students || [])],
        studentStats: {
          ...prev.principal.studentStats,
          total: (prev.principal.studentStats?.total || 0) + 1,
          [`group${newStudent.group}`]: (prev.principal.studentStats?.[`group${newStudent.group}`] || 0) + 1,
        },
      },
    }));
  };

  const updateStudent = (rollNo, updatedFields) => {
    commitState((prev) => ({
      ...prev,
      principal: {
        ...prev.principal,
        students: (prev.principal.students || []).map((s) =>
          s.rollNo === Number(rollNo) ? { ...s, ...updatedFields } : s
        ),
      },
    }));
  };

  const deleteStudent = (rollNo) => {
    commitState((prev) => ({
      ...prev,
      principal: {
        ...prev.principal,
        students: (prev.principal.students || []).filter((s) => s.rollNo !== Number(rollNo)),
        studentStats: {
          ...prev.principal.studentStats,
          total: Math.max(0, (prev.principal.studentStats?.total || 0) - 1),
        },
      },
    }));
  };

  const addFaculty = (newFaculty) => {
    commitState((prev) => ({
      ...prev,
      principal: {
        ...prev.principal,
        faculty: [
          ...(prev.principal.faculty || []),
          { ...newFaculty, sNo: (prev.principal.faculty?.length || 0) + 1, status: 'active' },
        ],
        facultyStats: {
          ...prev.principal.facultyStats,
          total: (prev.principal.facultyStats?.total || 0) + 1,
          subjectFaculty:
            newFaculty.role === 'Subject Faculty'
              ? (prev.principal.facultyStats?.subjectFaculty || 0) + 1
              : prev.principal.facultyStats?.subjectFaculty || 0,
          assistantFaculty:
            newFaculty.role === 'Assistant Faculty'
              ? (prev.principal.facultyStats?.assistantFaculty || 0) + 1
              : prev.principal.facultyStats?.assistantFaculty || 0,
        },
      },
    }));
  };

  const addNotice = (newNotice) => {
    const formatted = {
      srNo: Date.now(),
      date:
        newNotice.date ||
        new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      type: newNotice.type || 'General',
      audience: newNotice.audience || 'All Students & Faculty',
      message: newNotice.message || '',
      ...newNotice,
    };
    commitState((prev) => ({
      ...prev,
      principal: {
        ...prev.principal,
        notices: [formatted, ...(prev.principal.notices || [])],
      },
      faculty: {
        ...prev.faculty,
        notices: [formatted, ...(prev.faculty.notices || [])],
      },
      assistant: {
        ...prev.assistant,
        notices: [formatted, ...(prev.assistant.notices || [])],
      },
      student: {
        ...prev.student,
        notices: [formatted, ...(prev.student.notices || [])],
      },
    }));
  };

  const addDisciplineRemark = (remark) => {
    const text = remark.description || remark.message || '';
    const formatted = {
      srNo: Date.now(),
      date:
        remark.date ||
        new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      ...remark,
      description: text,
      message: text,
    };
    commitState((prev) => ({
      ...prev,
      principal: {
        ...prev.principal,
        discipline: {
          ...prev.principal.discipline,
          undisciplined: [formatted, ...(prev.principal.discipline?.undisciplined || [])],
        },
      },
      assistant: {
        ...prev.assistant,
        disciplineHistory: [formatted, ...(prev.assistant.disciplineHistory || [])],
      },
      student: {
        ...prev.student,
        disciplineHistory: [formatted, ...(prev.student.disciplineHistory || [])],
      },
    }));
  };

  const toggleSyllabusTopic = (chapterNo, topicNo) => {
    commitState((prev) => ({
      ...prev,
      faculty: {
        ...prev.faculty,
        chapters: (prev.faculty.chapters || []).map((ch) => {
          if (ch.chapterNo !== chapterNo) return ch;
          return {
            ...ch,
            topics: (ch.topics || []).map((t) =>
              t.topicNo === topicNo ? { ...t, status: t.status === 'done' ? 'pending' : 'done' } : t
            ),
          };
        }),
      },
    }));
  };

  const updateAssistantLtMarks = (ltId, rollNo, mark) => {
    commitState((prev) => {
      const currentList = prev.assistant.lt?.historyStudentMarks?.[ltId] || [];
      const updatedList = currentList.map((item) =>
        item.rollNo === Number(rollNo) ? { ...item, mark } : item
      );
      return {
        ...prev,
        assistant: {
          ...prev.assistant,
          lt: {
            ...prev.assistant.lt,
            historyStudentMarks: {
              ...(prev.assistant.lt?.historyStudentMarks || {}),
              [ltId]: updatedList,
            },
          },
        },
      };
    });
  };

  const addExamUnit = (unitData) => {
    commitState((prev) => {
      const nextHistory = [
        {
          srNo: (prev.faculty.examHistory?.length || 0) + 1,
          date: unitData.date,
          type: unitData.type,
          unit: unitData.unit,
        },
        ...(prev.faculty.examHistory || []),
      ];
      const nextUpcoming = [
        {
          srNo: (prev.assistant.examUpcoming?.length || 0) + 1,
          date: unitData.date,
          subject: unitData.subject || prev.faculty.faculty?.subject || 'Physics',
          unit: unitData.unit,
          type: unitData.type,
        },
        ...(prev.assistant.examUpcoming || []),
      ];
      return {
        ...prev,
        faculty: { ...prev.faculty, examHistory: nextHistory },
        assistant: { ...prev.assistant, examUpcoming: nextUpcoming },
      };
    });
  };

  const submitExamMarks = (examNo, groupKey, marksRows) => {
    const key = `${examNo}:${groupKey || 'ALL'}`;
    commitState((prev) => {
      const wasAwaiting = (prev.assistant.examCompleted || []).some(
        (ex) => Number(ex.examNo) === Number(examNo) && ex.status === 'awaiting'
      );
      const updatedCompleted = (prev.assistant.examCompleted || []).map((ex) =>
        Number(ex.examNo) === Number(examNo) ? { ...ex, status: 'entered' } : ex
      );
      return {
        ...prev,
        assistant: {
          ...prev.assistant,
          examCompleted: updatedCompleted,
          examMarksByExamNo: {
            ...(prev.assistant.examMarksByExamNo || {}),
            [key]: marksRows,
          },
          homeStats: {
            ...(prev.assistant.homeStats || {}),
            pendingExamMarks: wasAwaiting
              ? Math.max(0, (prev.assistant.homeStats?.pendingExamMarks || 1) - 1)
              : prev.assistant.homeStats?.pendingExamMarks || 0,
          },
        },
      };
    });
  };

  const updateExamMark = (examNo, groupKey, rollNo, updatedRow) => {
    const key = `${examNo}:${groupKey || 'ALL'}`;
    commitState((prev) => {
      const defaultStudents = prev.assistant.examMarksStudents || [];
      const existing =
        prev.assistant.examMarksByExamNo?.[key] ||
        defaultStudents.map((s) => ({
          rollNo: s.rollNo,
          name: s.name,
          phy: '82',
          chem: '79',
          third: '88',
          single: '82',
          ab: false,
          total: '249',
        }));
      const nextRows = existing.map((r) =>
        Number(r.rollNo) === Number(rollNo) ? { ...r, ...updatedRow } : r
      );
      return {
        ...prev,
        assistant: {
          ...prev.assistant,
          examMarksByExamNo: {
            ...(prev.assistant.examMarksByExamNo || {}),
            [key]: nextRows,
          },
        },
      };
    });
  };

  const publishResult = ({ standard, division, type, date }) => {
    const dt =
      date || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    commitState((prev) => {
      const newEntry = {
        srNo: (prev.assistant.resultHistory?.length || 0) + 1,
        standard,
        division,
        date: dt,
        type,
      };
      const studentEntry = {
        srNo: (prev.student.resultHistory?.length || 0) + 1,
        type,
        standard: `${standard}-${division}`,
        date: dt,
      };
      const prevStats = prev.assistant.resultStats || { total: 0, weekly: 0, monthly: 0, annual: 0 };
      const typeKey = String(type || 'Weekly').toLowerCase();
      return {
        ...prev,
        assistant: {
          ...prev.assistant,
          resultHistory: [newEntry, ...(prev.assistant.resultHistory || [])],
          resultStats: {
            ...prevStats,
            total: (prevStats.total || 0) + 1,
            [typeKey]: (prevStats[typeKey] || 0) + 1,
          },
        },
        student: {
          ...prev.student,
          resultHistory: [studentEntry, ...(prev.student.resultHistory || [])],
        },
      };
    });
  };

  const publishHallTicket = ({ standard, type, date }) => {
    const dt =
      date || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    commitState((prev) => ({
      ...prev,
      assistant: {
        ...prev.assistant,
        hallTicketHistory: [
          { srNo: (prev.assistant.hallTicketHistory?.length || 0) + 1, standard, date: dt, type },
          ...(prev.assistant.hallTicketHistory || []),
        ],
      },
      student: {
        ...prev.student,
        hallTickets: [
          {
            srNo: (prev.student.hallTickets?.length || 0) + 1,
            standard: `${standard}-A`,
            date: dt,
            examType: type,
          },
          ...(prev.student.hallTickets || []),
        ],
      },
    }));
  };

  return (
    <DataContext.Provider
      value={{
        principal: state.principal,
        principalData: state.principal,
        faculty: state.faculty,
        facultyData: state.faculty,
        assistant: state.assistant,
        assistantData: state.assistant,
        student: state.student,
        studentData: state.student,
        addStudent,
        updateStudent,
        deleteStudent,
        addFaculty,
        addNotice,
        addDisciplineRemark,
        toggleSyllabusTopic,
        updateAssistantLtMarks,
        addExamUnit,
        submitExamMarks,
        updateExamMark,
        publishResult,
        publishHallTicket,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
