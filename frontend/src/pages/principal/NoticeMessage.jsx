import React, { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import NoticeWorkspace from '../../components/common/NoticeWorkspace';

export default function NoticeMessage() {
  const { setHeader } = useOutletContext();

  useEffect(() => {
    setHeader({
      title: 'Notice & Announcement Center',
      subtitle: 'Send circulars with images/PDFs to all or specific faculty & view staff messages',
    });
  }, [setHeader]);

  return <NoticeWorkspace viewerRole="principal" />;
}
