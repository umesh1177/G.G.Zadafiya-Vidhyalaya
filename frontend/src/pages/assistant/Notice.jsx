import React, { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import NoticeWorkspace from '../../components/common/NoticeWorkspace';

export default function AssistantNotice() {
  const { setHeader } = useOutletContext();

  useEffect(() => {
    setHeader({
      title: 'Notice & Communications Center',
      subtitle: 'View circulars and send notices with attachments to Principal & Subject Faculty',
    });
  }, [setHeader]);

  return (
    <div className="content">
      <NoticeWorkspace viewerRole="assistant" />
    </div>
  );
}
