import React from 'react';
import { useParams } from 'react-router-dom';
import LiveTranscript from '../components/LiveTranscript';
import SummaryView from '../components/SummaryView';

function MeetingDetail() {
  const { id } = useParams();

  return (
    <div className="meeting-detail">
      <h1>Meeting details</h1>
      <LiveTranscript recordingId={id} />
      <SummaryView recordingId={id} />
    </div>
  );
}

export default MeetingDetail;