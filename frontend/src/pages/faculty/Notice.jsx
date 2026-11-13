import React, { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import NoticeWorkspace from '../../components/common/NoticeWorkspace';

export default function FacultyNotice() {
  const { setHeader } = useOutletContext();

  useEffect(() => {
    setHeader({
      title: 'Notice & Communications Center',
      subtitle: 'Receive school circulars and message Principal, Subject Faculty, or Assistant Faculty',
    });
  }, [setHeader]);

  return <NoticeWorkspace viewerRole="faculty" />;
}
